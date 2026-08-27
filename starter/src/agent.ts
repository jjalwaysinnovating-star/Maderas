import { Agent } from "agents";
import { applyLanguage } from "./idioma";
import { streamText } from "ai";
import type { SystemModelMessage } from "ai";
import type { Env } from "./env";
import { Db } from "./db/client";
import { ConversationsRepo } from "./db/conversations";
import { MessagesRepo } from "./db/messages";
import { isPro } from "./config";
import { resolveAgentConfig } from "./settings-loader";
import { SETTING_KEYS } from "./db/settings";
import { maskTelegramToken, unmaskTelegramToken } from "./telegramFiles";
import { buildTools } from "./tools";
import { buildMultimodalUserMessage } from "./media/vision";
import { chunkReply } from "./replies/chunker";
import { pickAdapter } from "./replies/sender";
import { selectModel } from "./upgrade/modelSelector";
import type { Tier } from "./upgrade/modelSelector";
import { dateAnchorBlock } from "./time/dateAnchor";
import { monthIaCostUsd, applyBudgetGuard } from "./budget";
import { CustomerFactsRepo } from "./db/facts";
import { createModel } from "./llm/provider";
import { costOfUsage } from "./pricing";
import type { ChannelId } from "./channels/shared";
import type { SearchKbResult } from "./tools/searchKb";

// Mensaje fijo cuando el LLM falló del todo (primario + retries + fallback).
// No se verifica en el Blindaje: no afirma ningún dato.
const LLM_FAILURE_REPLY = "Algo falló de mi lado, intenta de nuevo en un momento.";

export interface SupportAgentState {
  conversationId: string | null;
  channel: string;
  channelUserId: string;
  pendingMessages: { text: string; receivedAt: number }[];
  lastAlarmAt: number;
  lastUserLang: string;
  toolCallsInLast2Turns: number;
  lastSearchKbScore: number;
  imageRetryCount: number;
}

export interface AgentIncomingPayload {
  channel: string;
  channelUserId: string;
  displayName?: string;
  text?: string;
  audioUrl?: string;
  imageUrl?: string;
  isOwnerMessage?: boolean;
}

export class SupportAgent extends Agent<Env, SupportAgentState> {
  initialState: SupportAgentState = {
    conversationId: null,
    channel: "",
    channelUserId: "",
    pendingMessages: [],
    lastAlarmAt: 0,
    lastUserLang: "es",
    toolCallsInLast2Turns: 0,
    lastSearchKbScore: 1,
    imageRetryCount: 0,
  };

  /**
   * Called by the Worker fetch handler when a webhook arrives for this user.
   * Buffers the message, schedules/resets an alarm.
   */
  async ingest(payload: AgentIncomingPayload): Promise<{ acknowledged: true }> {
    // El DO del chat corre en su propio env y NO pasa por el middleware del
    // Worker: aplicamos el tier efectivo aquí para que Forja+ (visión, tools
    // Pro, Blindaje) se prenda/apague en el chat también. Cache 30s por isolate.
    const { applyTier } = await import("./tier");
    await applyTier(this.env);
    await applyLanguage(this.env);

    const db = new Db(this.env.DB);
    const convs = new ConversationsRepo(db);
    const conv = await convs.getOrCreate(
      payload.channel,
      payload.channelUserId,
      payload.displayName,
    );
    this.setState({
      ...this.state,
      channel: payload.channel,
      channelUserId: payload.channelUserId,
      conversationId: conv.id,
    });

    // NOTA: antes, un mensaje del dueño (isOwnerMessage) auto-pausaba la
    // conversación 60 min. Pero ese flag SOLO lo pone el canal de Telegram, y
    // solo cuando el remitente es el propio dueño (channelUserId ==
    // OWNER_TELEGRAM_CHAT_ID). En Telegram 1-a-1 el dueño no puede escribir en
    // el hilo de un cliente, así que ese flag nunca es una intervención real:
    // siempre es el dueño PROBANDO su bot como si fuera cliente. Auto-pausar ahí
    // creaba un ciclo — reanudar → probar → re-pausa (reportado 30-jul-2026).
    //
    // La pausa por intervención real se hace desde el panel (inbox → responder /
    // Pausar), que sí respeta takeover_minutes. Aquí el mensaje del dueño sigue
    // su curso normal para que el bot le responda y pueda probarlo.

    // Media se procesa ANTES de las pausas: una conversación en pausa igual debe
    // dejar el mensaje del cliente en el panel, y legible — la transcripción de la
    // nota de voz, no "(audio)".
    const { processedText, hasImage } = await this.processMedia(payload, db, conv.id);

    // Conversación en pausa (un humano tomó el control): el bot se calla, pero el
    // mensaje del cliente DEBE registrarse — si no, nunca aparece en el panel y el
    // equipo no tiene qué contestar a mano (que es el punto de pausar). Visto en
    // prod (2026-07-29). Reportado por conconfianza.
    if (await convs.isPaused(conv.id)) {
      await this.recordWithoutReplying(db, conv.id, processedText);
      return { acknowledged: true };
    }

    // Keyword del modo evento (QUIERO/RECURSOS): se cuenta para el embudo y el
    // mensaje SIGUE su camino al agente (LLM) — el playbook de qué hacer con la
    // keyword vive en el system prompt. Solo le quitamos la espera del buffer.
    let isEventKeyword = false;
    if (payload.text && !payload.audioUrl && !payload.imageUrl) {
      const { logKeywordHit } = await import("./tools/masterclass");
      isEventKeyword = (await logKeywordHit(this.env, payload.text, conv.id)) !== null;
    }

    // Guardrail anti-abuso. El tope diario de turnos aplica a TODO mensaje que
    // produce un turno (texto, AUDIO e IMAGEN incluidos) — una ráfaga de notas
    // de voz también quema la llave de IA del miembro, así que cuenta igual. El
    // anti-repetición sí es solo-texto (necesita texto para detectar la copia).
    // Las keywords del evento quedan exentas del anti-repetición.
    if (!isEventKeyword) {
      try {
        const { isRepeatSpam, SPAM_SNOOZE_MS, isOverDailyCap, DAILY_CAP_SNOOZE_MS, DAILY_CAP_MESSAGE } =
          await import("./spam");
        // Anti-repetición (solo texto).
        if (payload.text && !payload.audioUrl && !payload.imageUrl && (await isRepeatSpam(db, conv.id, payload.text))) {
          await convs.setPausedUntil(conv.id, Date.now() + SPAM_SNOOZE_MS);
          // Quien repite un mensaje casi nunca es un bot: suele ser alguien con
          // prisa que cree que no le leyeron. Callar sin avisar era indistinguible
          // de un bot roto (reporte de Eduardo Cume) — el tope diario sí se
          // despide; este guard ahora también, y deja ticket para que la pausa
          // aparezca en el panel de alguien. Best-effort: si algo falla, la
          // pausa aplica igual.
          const { REPEAT_PAUSE_MESSAGE } = await import("./spam");
          try {
            const channel = payload.channel as ChannelId;
            await new MessagesRepo(db).append(conv.id, "assistant", REPEAT_PAUSE_MESSAGE);
            await pickAdapter(channel).sendReply(
              { channel, channelUserId: payload.channelUserId, chunks: [REPEAT_PAUSE_MESSAGE] },
              this.env,
            );
            const { createHandoffTicket } = await import("./tools/handoffHuman");
            await createHandoffTicket(this.env, {
              conversationId: conv.id,
              reason: "conversación pausada (mensajes repetidos)",
              summary: `El cliente mandó el mismo mensaje varias veces ("${payload.text.slice(0, 120)}") y la conversación quedó en pausa 1 hora. Puede ser alguien con prisa: échale un ojo y contéstale tú si hace falta.`,
              category: "other",
            });
          } catch (e) {
            console.warn("[spam-guard] aviso/ticket del anti-repetición falló:", e);
          }
          console.warn(`[spam-guard] conv ${conv.id} en cooldown 1h (mensaje repetido) — cliente avisado + ticket`);
          return { acknowledged: true };
        }
        // Tope diario de turnos (texto + media): despedida amable UNA vez +
        // descanso 12h. La pausa garantiza que no se repita (los siguientes
        // mensajes mueren en isPaused antes de llegar aquí).
        if (await isOverDailyCap(db, conv.id)) {
          await convs.setPausedUntil(conv.id, Date.now() + DAILY_CAP_SNOOZE_MS);
          await new MessagesRepo(db).append(conv.id, "assistant", DAILY_CAP_MESSAGE);
          const channel = payload.channel as ChannelId;
          await pickAdapter(channel).sendReply(
            { channel, channelUserId: payload.channelUserId, chunks: [DAILY_CAP_MESSAGE] },
            this.env,
          );
          console.warn(`[spam-guard] conv ${conv.id} tope diario de turnos → descanso 12h`);
          return { acknowledged: true };
        }
      } catch (e) {
        // El guard es un extra, nunca la ruta crítica: si falla, se responde normal.
        console.warn("[spam-guard] check failed:", e);
      }
    }

    // (media ya se procesó arriba, antes de las pausas — ver processMedia)

    // Append to buffer (we always persist the client's message)
    const pending = [
      ...this.state.pendingMessages,
      { text: processedText, receivedAt: Date.now() },
    ];
    this.setState({
      ...this.state,
      pendingMessages: pending,
      imageRetryCount: hasImage ? 0 : this.state.imageRetryCount,
    });

    // Resolve effective config (D1 settings overlaid on env defaults).
    // We need at least bot_paused (to decide whether to reply) and the buffer.
    const cfg = await resolveAgentConfig(this.env, []);

    // Owner paused the bot via the dashboard → keep the message buffered but
    // stay silent: do NOT arm the alarm, so alarm() never runs.
    // Mismo hueco que la pausa por conversación: el mensaje solo vivía en
    // pendingMessages (estado del DO), que el panel no ve — el dueño no tenía cómo
    // leer lo que entró con el bot apagado. Se queda en buffer (igual) y ahora
    // también se registra.
    if (cfg.botPaused) {
      await this.recordWithoutReplying(db, conv.id, processedText);
      return { acknowledged: true };
    }

    // Schedule buffer processing via the agents SDK scheduler.
    // The SDK overrides alarm() to dispatch named callbacks from its
    // cf_agents_schedules table, so raw ctx.storage.setAlarm() alone won't
    // invoke our code. We upsert a fixed 'msg-buffer' row (so rapid messages
    // debounce to a single fire) and set the raw alarm as the trigger.
    // Keyword del evento → fast lane: procesa casi al instante (el cierre en
    // vivo no puede esperar el buffer completo).
    // Rescate de mensajes varados: una alarma de Cloudflare puede fallar en
    // silencio y dejar el mensaje del cliente esperando hasta que reescriba
    // (vimos a un cliente esperar 11 min y escribir "¿Hola?"). Si el más viejo del
    // buffer ya rebasó 2x el tiempo normal, no esperes otra ventana entera.
    // Reportado por conconfianza.
    const oldestAt = pending[0]?.receivedAt ?? Date.now();
    const hasStranded = Date.now() - oldestAt > cfg.bufferMs * 2;
    const alarmAt = Date.now() + (isEventKeyword || hasStranded ? 500 : cfg.bufferMs);
    const alarmAtSec = Math.floor(alarmAt / 1000);
    this.sql`
      INSERT OR REPLACE INTO cf_agents_schedules
        (id, callback, payload, type, time, created_at)
      VALUES
        ('msg-buffer', 'processBuffer', '{}', 'delayed', ${alarmAtSec}, unixepoch())
    `;
    await this.ctx.storage.setAlarm(alarmAt);
    // Candado barato contra la alarma perdida: si no quedó armada, reintenta una
    // vez y deja rastro en el log.
    if ((await this.ctx.storage.getAlarm()) === null) {
      console.error("[ingest] alarm was not armed — retrying");
      await this.ctx.storage.setAlarm(alarmAt);
    }
    this.setState({ ...this.state, lastAlarmAt: alarmAt });

    return { acknowledged: true };
  }

  /**
   * Audio → transcripción; imagen → marcador multimodal Pro (+ archivo a la
   * Bóveda si está activa). Extraído de ingest() para que los caminos en pausa
   * puedan registrar un mensaje LEGIBLE (la transcripción, no un placeholder).
   */
  private async processMedia(
    payload: AgentIncomingPayload,
    db: Db,
    conversationId: string,
  ): Promise<{ processedText: string; hasImage: boolean }> {
    let processedText = payload.text ?? "";
    let hasImage = false;

    if (payload.audioUrl) {
      try {
        const { transcribeAudio } = await import("./media/transcribe");
        const result = await transcribeAudio(payload.audioUrl, this.env);
        processedText = result.text || "(audio sin transcripción)";
      } catch (e) {
        console.error("[ingest] transcription failed:", e);
        processedText = "(no pude entender el audio)";
      }
    }

    if (payload.imageUrl) {
      hasImage = true;
      // Bóveda (opt-in, Pro): archiva la imagen en el R2 del miembro ANTES de que
      // la URL del proveedor expire. Solo si hay binding MEDIA y el superpoder
      // está ON. Fail-open — jamás bloquea el ingest.
      if (this.env.MEDIA && isPro(this.env)) {
        const bov = await db.first<{ value: string }>(
          "SELECT value FROM settings WHERE key = ?",
          [SETTING_KEYS.bovedaEnabled],
        );
        if (bov?.value === "1") {
          const { captureIncomingMedia } = await import("./media/boveda");
          await captureIncomingMedia(this.env, db, {
            conversationId,
            url: payload.imageUrl,
            caption: payload.text ?? undefined,
            kind: "image",
          });
        }
      }
      // Pro-only: if free tier, strip the image and inform the bot owner-side
      if (!isPro(this.env)) {
        processedText =
          (processedText || "") +
          "\n(El cliente mandó una imagen, pero tu plan no soporta análisis de imágenes.)";
      } else {
        processedText =
          (processedText || "(imagen sin caption)") +
          // Enmascara el token: una file URL de Telegram lo lleva dentro, y este
          // marcador se persiste en D1 (y se ve en el panel y en los exports).
          // Ver src/telegramFiles.ts. Reportado por conconfianza.
          `\n[IMAGE_URL: ${maskTelegramToken(payload.imageUrl)}]`;
      }
    }

    return { processedText, hasImage };
  }

  /**
   * El bot no va a responder este, pero el mensaje del cliente igual tiene que
   * llegar al panel para que un humano lo tome. Best-effort a propósito: si D1
   * falla, el webhook NO debe fallar — perder el registro es malo, devolverle un
   * error al canal es peor. Reportado por conconfianza.
   */
  private async recordWithoutReplying(
    db: Db,
    conversationId: string,
    text: string,
  ): Promise<void> {
    if (!text.trim()) return;
    try {
      await new MessagesRepo(db).append(conversationId, "user", text);
    } catch (e) {
      console.error("[ingest] could not record the message while paused:", e);
    }
  }

  /**
   * Called by the agents SDK scheduler when the msg-buffer task fires.
   * Processes accumulated messages as one input, runs the LLM loop, and
   * sends the chunked reply over the channel adapter.
   */
  async processBuffer(): Promise<void> {
    // Despertó por alarm del DO (sin middleware): refresca el tier efectivo para
    // que el Blindaje (Pro) y el gating de la respuesta usen el valor real.
    const { applyTier } = await import("./tier");
    await applyTier(this.env);
    await applyLanguage(this.env);

    const buffered = [...this.state.pendingMessages];
    this.setState({ ...this.state, pendingMessages: [] });
    if (buffered.length === 0) return;

    const combined = buffered.map((m) => m.text).join("\n").trim();
    if (!combined) return;

    const db = new Db(this.env.DB);
    const msgs = new MessagesRepo(db);
    const convs = new ConversationsRepo(db);
    const convId = this.state.conversationId;
    if (!convId) {
      console.warn("[SupportAgent.processBuffer] no conversation_id in state");
      return;
    }

    // Persist user message
    await msgs.append(convId, "user", combined);
    await convs.touchLastMessage(convId);

    // Load history (last 20)
    const history = await msgs.lastN(convId, 20);
    const aiMessages: any[] = history.slice(0, -1).map((m) => ({
      role: (m.role === "tool"
        ? "user"
        : m.role === "owner"
          ? "assistant"
          : m.role) as "user" | "assistant",
      content: m.content,
    }));
    // Build the LAST user message multimodal-aware: if it carries an
    // [IMAGE_URL: ...] marker AND we're on the Pro tier, attach the image.
    const lastUserMsg = history[history.length - 1];
    if (lastUserMsg) {
      const imgMatch = lastUserMsg.content.match(/\[IMAGE_URL: (.+?)\]/);
      if (imgMatch && isPro(this.env)) {
        // El token se enmascaró al guardar; vuelve solo aquí, para bajar el
        // archivo. Nunca sale de esta llamada.
        const imageUrl = unmaskTelegramToken(imgMatch[1], this.env.TELEGRAM_BOT_TOKEN);
        const cleanText = lastUserMsg.content
          .replace(/\n?\[IMAGE_URL: .+?\]/, "")
          .trim();
        aiMessages.push(buildMultimodalUserMessage(cleanText, imageUrl));
      } else {
        aiMessages.push({ role: "user", content: lastUserMsg.content });
      }
    }

    // Blindaje anti-invento: pasajes de KB consultados ESTE turno. searchKb
    // los stashea vía callback — el verificador pre-envío los usa como fuente
    // de verdad y el selector de modelo aprovecha el score real (antes
    // lastSearchKbScore era un campo muerto que nunca se actualizaba).
    let turnKbPassages: SearchKbResult[] = [];
    let turnUsedKb = false;
    let lastKbTopScore = 1;

    // Build tools registry (tier-gated in buildTools)
    const tools = buildTools({
      env: this.env,
      getConversationId: () => convId,
      onSearchKb: (results) => {
        turnUsedKb = true;
        turnKbPassages = [...turnKbPassages, ...results].slice(-10);
        lastKbTopScore = results[0]?.score ?? 0;
      },
    });
    const toolNames = Object.keys(tools);

    // Resolve effective config (D1 settings overlaid on env defaults).
    const cfg = await resolveAgentConfig(this.env, toolNames, this.state.channel || undefined);

    // Honor the dashboard's tool toggles: the prompt already only advertises
    // enabled tools (settings-loader), so the registry must match.
    const enabledTools = Object.fromEntries(
      Object.entries(tools).filter(([name]) => cfg.enabledToolNames.includes(name)),
    );

    // Bots que toman pedidos/citas/reservas: el flujo es de varios pasos y el tier
    // barato lo aplasta en un solo mensaje (reportado por bots de restaurante). Con
    // estas tools activas, el modo "auto" arranca en el modelo inteligente para que
    // respete el "un paso a la vez". Ver selectModel + MODEL_CONTROL.
    const INTAKE_TOOLS = ["tomarPedido", "crearReservacion", "scheduleAppointment", "agendarCita"];
    const isTransactional = INTAKE_TOOLS.some((t) => cfg.enabledToolNames.includes(t));

    // Select tier: honor an explicit override, otherwise auto-select. The active
    // provider (Anthropic default | OpenAI) maps the tier to a concrete model id.
    let tier: Tier =
      cfg.modelOverride === "haiku"
        ? "fast"
        : cfg.modelOverride === "sonnet"
          ? "smart"
          : selectModel({
              toolCallsInLast2Turns: this.state.toolCallsInLast2Turns,
              lastUserText: combined,
              lastUserLang: this.env.BOT_LANGUAGE,
              hasImage: false,
              imageRetryCount: this.state.imageRetryCount,
              lastSearchKbScore: this.state.lastSearchKbScore,
              transactional: isTransactional,
            });

    // Budget guard: al presupuesto baja al modelo barato (sigue respondiendo);
    // al 2× del presupuesto CORTA para proteger la llave del miembro de una
    // fuga (bot en loop). Default $25/mes (settings-loader). Fail-open: si el
    // cálculo de costo falla (D1), NO bloquea el turno — la respuesta sale.
    if (cfg.monthlyBudgetUsd !== undefined) {
      let guard: { tier: typeof tier; downgraded: boolean; stop: boolean } | null = null;
      let spent = 0;
      try {
        spent = await monthIaCostUsd(db);
        guard = applyBudgetGuard(tier, spent, cfg.monthlyBudgetUsd);
      } catch (e) {
        console.warn("[budget] cálculo de costo falló, se ignora el guard este turno:", e);
      }
      if (guard?.stop) {
        console.error(
          `[SupportAgent] HARD STOP — gasto $${spent.toFixed(2)} ≥ 2× tope $${cfg.monthlyBudgetUsd}. El bot descansa para proteger tu llave de IA.`,
        );
        try {
          const { notifyBudgetHardStop } = await import("./tools/handoffHuman");
          await notifyBudgetHardStop(this.env, db, spent, cfg.monthlyBudgetUsd);
        } catch (e) {
          console.warn("[budget] notify failed:", e);
        }
        return; // no gasta más LLM este turno
      }
      if (guard?.downgraded) {
        console.warn(
          `[SupportAgent] monthly budget reached ($${spent.toFixed(2)}/$${cfg.monthlyBudgetUsd}) — downgrading to fast tier`,
        );
      }
      if (guard) tier = guard.tier;
    }

    const { model, modelId, supportsPromptCache } = createModel(this.env, tier, cfg.llm);

    // Cache the (large, stable) system prompt with an ephemeral cache breakpoint.
    // Only the system block is cached — messages change every turn. Cache hits
    // show up in usage.cachedInputTokens (read below for cost accounting).
    // Prompt caching is Anthropic-only; on OpenAI we send the plain system block.
    const system: SystemModelMessage[] = [
      {
        role: "system",
        content: cfg.systemPrompt,
        ...(supportsPromptCache
          ? { providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } }
          : {}),
      },
    ];

    // Ancla temporal (bloque UNCACHED, como la memoria del cliente): sin esto el
    // bot no sabe qué día es hoy y el modelo inventa el año al resolver fechas
    // relativas ("el jueves 27") → consulta/agenda una fecha pasada y escala en
    // vez de agendar. El prompt grande de arriba sigue cacheado intacto.
    system.push({ role: "system", content: dateAnchorBlock(this.env) });

    // Customer memory (flywheel): facts extracted by the insights analyzer are
    // injected as a small UNCACHED system block, so a returning customer is
    // greeted by a bot that remembers them. The big prompt above stays cached.
    // Memory is an enhancement, never the critical path: if the lookup fails,
    // the reply still goes out.
    try {
      const facts = await new CustomerFactsRepo(db).forConversation(convId, 8);
      if (facts.length > 0) {
        system.push({
          role: "system",
          content: `<cliente>\nLo que ya sabes de este cliente (de conversaciones pasadas):\n${facts
            .map((f) => `- ${f.fact}`)
            .join("\n")}\n</cliente>`,
        });
      }
    } catch (e) {
      console.warn("[SupportAgent] customer facts lookup failed:", e);
    }

    // Canal de la conversación (bloque chico, sin caché): el playbook puede
    // cambiar por canal — ej. registro conversacional en WhatsApp vs mandar el
    // link en Instagram. Sin esto el modelo no tiene forma de saber dónde está.
    if (this.state.channel) {
      const CANAL_HUMANO: Record<string, string> = {
        twilio: "WhatsApp",
        whatsapp: "WhatsApp",
        manychat: "Instagram (DMs vía ManyChat)",
        instagram: "Instagram",
        messenger: "Facebook Messenger",
        telegram: "Telegram",
      };
      system.push({
        role: "system",
        content: `<canal>Esta conversación es por ${CANAL_HUMANO[this.state.channel] ?? this.state.channel}.</canal>`,
      });
    }

    // Composio (integraciones genéricas, superpoder Pro): si el miembro
    // conectó apps vía Composio, anuncia sus tools disponibles — la tool
    // "composio" (tools/composio.ts) solo sabe ejecutar por slug; sin este
    // bloque el modelo no sabría qué slugs existen. Bloque chico, sin caché
    // (el catálogo de apps conectadas puede cambiar entre turnos).
    if (isPro(this.env)) {
      try {
        const { composioEnabled, listConnectedTools, getComposioContext } = await import(
          "./integrations/composio"
        );
        if (composioEnabled(this.env)) {
          const [composioTools, composioContext] = await Promise.all([
            listConnectedTools(this.env),
            getComposioContext(this.env),
          ]);
          if (composioTools.length > 0) {
            const toolLines = composioTools
              .map((t) => {
                const params = t.requiredParams.length ? ` (params: ${t.requiredParams.join(", ")})` : "";
                return `- ${t.slug}${params}: ${t.description}`;
              })
              .join("\n");
            const contextEntries = Object.entries(composioContext).filter(
              ([, cfg]) => cfg && typeof cfg === "object",
            );
            const contextBlock = contextEntries.length
              ? `\n\nCONTEXTO CONFIGURADO POR EL DUEÑO — usa estos valores por default cuando llames las tools de esa app, sin preguntarle ni adivinar:\n${contextEntries
                  .map(([toolkit, cfg]) => {
                    const fields = Object.entries(cfg as Record<string, unknown>)
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join(", ");
                    return `- ${toolkit} → ${fields}`;
                  })
                  .join("\n")}`
              : "";
            system.push({
              role: "system",
              content: `<integraciones_composio>\nApps conectadas por el dueño vía Composio. Para usarlas, llama la tool "composio" con { tool_slug, arguments }, incluyendo los params requeridos que se listan entre paréntesis:\n${toolLines}${contextBlock}\n</integraciones_composio>`,
            });
          }
        }
      } catch (e) {
        console.warn("[SupportAgent] composio tools lookup failed:", e);
      }
    }

    // A/B de estrategia de venta (modo evento): a cada conversación le toca un
    // "vendedor" fijo. Bloque chico y sin caché, igual que la memoria.
    {
      const { hasMasterclassMode, salesStrategyBlock } = await import("./tools/masterclass");
      if (hasMasterclassMode(this.env)) {
        system.push({ role: "system", content: salesStrategyBlock(convId) });
      }
    }

    let assistantText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let cachedTokens = 0;
    let toolCallCount = 0;
    let toolCallsMade: { toolName: string; input: unknown }[] = [];
    // Salidas de las tools del turno (excepto searchKb, que ya va en
    // turnKbPassages). El Blindaje las usa como FUENTE oficial: un dato que sale
    // de una tool (catálogo, inventario, una tool custom del miembro) NO es
    // inventado — antes se bloqueaban listados válidos por no verlas.
    let turnToolResults: { tool: string; output: string }[] = [];
    let usedModelId = modelId;

    // Corre el loop del LLM con un modelo dado; deja los resultados en las vars.
    const attempt = async (m: any, mId: string = modelId) => {
      // Anthropic Opus 4.7+/gen 5 rechazan temperature con 400 — ahí se ignora
      // la del dashboard en vez de tumbar cada respuesta (modelAcceptsTemperature).
      const { modelAcceptsTemperature } = await import("./llm/provider");
      const conTemp = cfg.temperature !== undefined && modelAcceptsTemperature(mId);
      const result = streamText({
        model: m,
        system,
        messages: aiMessages,
        tools: enabledTools,
        stopWhen: ({ steps }) => steps.length >= 6,
        ...(conTemp ? { temperature: cfg.temperature } : {}),
      });
      let text = "";
      for await (const chunk of result.textStream) {
        text += chunk;
      }
      assistantText = text;
      const usage = await result.usage;
      inputTokens = usage?.inputTokens ?? 0;
      outputTokens = usage?.outputTokens ?? 0;
      // AI SDK v7: los cache-read tokens se movieron de usage.cachedInputTokens
      // a usage.inputTokenDetails.cacheReadTokens. inputTokens sigue siendo el
      // TOTAL (incluye cached), así que costOfUsage((input - cached)…) no cambia.
      cachedTokens = usage?.inputTokenDetails?.cacheReadTokens ?? 0;
      const steps = await result.steps;
      toolCallCount = steps.reduce((n, s) => n + (s.toolCalls?.length ?? 0), 0);
      // Persist what the agent DID (not just what it said): tool name + input,
      // feeding the dashboard's thread chips, stats and the Mi Agente counters.
      toolCallsMade = steps.flatMap((s) =>
        (s.toolCalls ?? []).map((tc: any) => ({
          toolName: tc.toolName as string,
          input: tc.input,
        })),
      );
      // Salidas de las tools (excepto searchKb, ya cubierto por turnKbPassages):
      // fuente de verdad para el Blindaje. Cada salida se acota para no inflar el
      // prompt del verificador.
      turnToolResults = steps
        .flatMap((s: any) => s.toolResults ?? [])
        .filter((tr: any) => tr?.toolName && tr.toolName !== "searchKb")
        .map((tr: any) => ({
          tool: String(tr.toolName),
          output: (typeof tr.output === "string" ? tr.output : JSON.stringify(tr.output ?? tr.result ?? "")).slice(0, 4000),
        }));
    };

    try {
      await attempt(model);
    } catch (e: any) {
      // FAILOVER con backoff: en ráfagas (historias) el primario suele dar un
      // rate-limit TRANSITORIO — esperar con jitter y reintentar resuelve la
      // mayoría; si no, se prueba el proveedor alterno (también con un segundo
      // intento). El jitter des-sincroniza mensajes que llegaron en el mismo
      // segundo. El bot no puede quedarse mudo el día del evento.
      console.error("[SupportAgent.processBuffer] streamText failed:", e);
      const backoff = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const { fallbackModel } = await import("./llm/provider");
      const primary = createModel(this.env, tier, cfg.llm);
      const fb = fallbackModel(this.env, tier, primary.provider);
      let ok = false;

      await backoff(2000 + Math.floor(Math.random() * 1500));
      try {
        await attempt(model);
        ok = true;
      } catch (e1: any) {
        console.error("[SupportAgent.processBuffer] primary retry failed:", e1);
      }

      if (!ok && fb) {
        console.warn(
          `[SupportAgent] failover ${primary.provider} → ${fb.provider}/${fb.modelId}`,
        );
        try {
          await attempt(fb.model, fb.modelId);
          usedModelId = fb.modelId;
          ok = true;
        } catch (e2: any) {
          console.error("[SupportAgent.processBuffer] fallback failed:", e2);
          await backoff(2500 + Math.floor(Math.random() * 1500));
          try {
            await attempt(fb.model, fb.modelId);
            usedModelId = fb.modelId;
            ok = true;
          } catch (e3: any) {
            console.error("[SupportAgent.processBuffer] fallback retry failed:", e3);
          }
        }
      }

      // Último recurso para turnos con FOTO: si NINGÚN modelo pudo (p. ej. un
      // modelo BYO sin visión rechaza el mensaje multimodal), Workers AI
      // describe la imagen (sin llave extra) y se reintenta el primario con
      // puro texto — el cliente recibe respuesta en vez del "no pude procesar".
      if (!ok) {
        const ultimo: any = aiMessages[aiMessages.length - 1];
        const imgPart = Array.isArray(ultimo?.content)
          ? ultimo.content.find((p: any) => p?.type === "image")
          : null;
        if (imgPart) {
          try {
            const { describeImage } = await import("./media/vision");
            const desc = await describeImage(this.env, String(imgPart.image));
            if (desc) {
              const textPart = ultimo.content.find((p: any) => p?.type === "text");
              aiMessages[aiMessages.length - 1] = {
                role: "user",
                content: `${textPart?.text ?? ""}\n[El cliente mandó una FOTO. Descripción de la imagen: ${desc}]`.trim(),
              };
              await attempt(model);
              ok = true;
              console.warn("[vision] turno con foto rescatado con la descripción de Workers AI (modelo sin visión)");
            }
          } catch (eImg: any) {
            console.error("[vision] describe+reintento falló:", eImg);
          }
        }
      }

      if (!ok) {
        assistantText = LLM_FAILURE_REPLY;
      }
    }

    // ── Blindaje anti-invento (Pro): verificación pre-envío ──────────────────
    // Antes de mandar una respuesta que afirme datos (precio/horario/promesa),
    // se contrasta contra los pasajes de KB del turno + contexto del negocio.
    // Sin respaldo → sale un "déjame confirmarlo" y se avisa al dueño (ticket,
    // misma maquinaria del handoff). FAIL-OPEN: cualquier error/timeout del
    // verificador manda la respuesta original intacta — jamás bloquea un envío.
    if (assistantText && assistantText !== LLM_FAILURE_REPLY && cfg.blindajeEnabled) {
      try {
        const { guardReply } = await import("./blindaje/verify");
        const guard = await guardReply(this.env, {
          replyText: assistantText,
          turnUsedKb,
          kbPassages: turnKbPassages,
          toolResults: turnToolResults,
          businessContext: cfg.businessContext,
          systemPrompt: cfg.systemPrompt,
          // Los datos que el propio cliente dio (nombre/contacto/hora) respaldan
          // la recapitulación de una cita — sin esto el juez la tumbaba siempre.
          mensajesDelCliente: history
            .filter((m) => m.role === "user")
            .slice(-6)
            .map((m) => m.content),
          conversationId: convId,
          channel: this.state.channel,
          llm: cfg.llm,
        });
        if (guard.action === "replaced") {
          assistantText = guard.finalText;
        }
      } catch (e) {
        console.warn("[blindaje] guard falló — fail-open, va la respuesta original:", e);
      }
    }

    // Persist assistant message (with usage + model_used + tool calls)
    await msgs.append(convId, "assistant", assistantText, {
      modelUsed: usedModelId,
      inputTokens,
      outputTokens,
      cachedInputTokens: cachedTokens,
      toolCalls: toolCallsMade.length > 0 ? toolCallsMade : undefined,
    });

    // Update state for next turn. lastSearchKbScore = score top-1 de la última
    // búsqueda en KB del turno: si vino débil (<0.5) el selector sube a "smart"
    // el siguiente turno (upgrade/modelSelector). Sin búsqueda este turno
    // regresa a neutral (1) — el boost dura un turno, igual que
    // toolCallsInLast2Turns.
    this.setState({
      ...this.state,
      toolCallsInLast2Turns: toolCallCount,
      lastSearchKbScore: turnUsedKb ? lastKbTopScore : 1,
    });

    // Chunk + send via the channel adapter. SIEMPRE por sendChunkedReply: ahí
    // viven los marcadores ([[botones: …]] y [[media: …]]) — un sendReply
    // directo aquí los dejaba pasar CRUDOS al cliente (bug real, visto en el
    // demo de IG con la Galería).
    const chunks = chunkReply(assistantText, cfg.maxChunks);
    const channel = this.state.channel as ChannelId;
    const adapter = pickAdapter(channel);
    const { sendChunkedReply } = await import("./replies/sender");
    await sendChunkedReply(
      adapter,
      channel,
      this.state.channelUserId,
      chunks,
      this.env,
      cfg.interChunkDelayMs,
    );

    // Red de seguridad del lead: si el bot acaba de prometer que un asesor
    // contactará y NO registró a nadie, lo levantamos nosotros. Va después de
    // enviar para no retrasarle la respuesta al cliente, y nunca tumba el turno:
    // el mensaje ya salió, lo peor que puede pasar es que el rescate falle.
    try {
      const { rescataLeadPrometido } = await import("./leads/rescate");
      await rescataLeadPrometido(this.env, convId, assistantText);
    } catch (e) {
      console.error("[SupportAgent.processBuffer] rescate de lead falló:", e);
    }

    console.log(
      `[SupportAgent.processBuffer] sent ${chunks.length} chunks, model=${usedModelId}, cost=$${costOfUsage(
        usedModelId,
        { input: inputTokens, cached: cachedTokens, output: outputTokens },
      ).toFixed(5)}`,
    );
  }
}

import type { Env } from "../../env";
import { traductor } from "../i18n";
import { Db } from "../../db/client";
import { LeadsRepo, leadMetadata, type Lead } from "../../db/leads";
import { getNiche } from "../../niches";
import { layout } from "./layout";
// Reparto entre asesores. Vive en member/ para que `forjabot update` no lo
// borre; aquí solo se consume.
import { filtroDeLeads, type FiltroLeads } from "../../../member/asesores.local";

// Escapa texto del LLM/cliente antes de meterlo en HTML (el intent y las notas
// pueden traer <, &, links pegados por el cliente, etc.).
function esc(v: string | null | undefined): string {
  return (v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface Col {
  h: string;
  w: string;
  cell: (l: Lead, meta: Record<string, string>) => string;
}

/** Traduce el filtro de asesor al argumento que entiende `LeadsRepo.list`. */
function argDeFiltro(f: FiltroLeads) {
  return f.modo === "asesor" ? { slug: f.slug, esPorDefecto: f.esPorDefecto } : undefined;
}

export async function renderLeads(env: Env): Promise<string> {
  const tr = traductor(env);
  const niche = getNiche(env);
  const leads = new LeadsRepo(new Db(env.DB));
  const filtro = filtroDeLeads(env as unknown as { PANEL_ROLE?: string; PANEL_EMAIL?: string });
  // "ninguno" es un correo que no está asignado a ningún asesor: no se consulta
  // la base siquiera, para que no haya forma de que se escape una fila.
  const list = filtro.modo === "ninguno" ? [] : await leads.list(100, undefined, argDeFiltro(filtro));

  // Las etiquetas del nicho son CLAVES del diccionario: se resuelven aquí, al
  // pintar, con el idioma del panel (ver src/niches/types.ts).
  const statusLabel = (s: Lead["status"]) => tr(niche.statusLabelKeys[s]);
  const recordSingular = tr(niche.recordSingularKey);
  const recordPlural = tr(niche.recordPluralKey);

  // Columnas: núcleo (fecha, nombre, contacto) + o bien las columnas del nicho
  // (leídas de metadata) o bien el "Resumen" genérico + estado (re-etiquetado).
  const cols: Col[] = [
    { h: esc(tr("leads.colFecha")), w: "94px", cell: (l) => `<span class="text-dim">${new Date(l.created_at).toLocaleDateString("es-MX")}</span>` },
    { h: esc(tr("leads.colNombre")), w: "minmax(120px,1.1fr)", cell: (l) => `<span class="text-cream" style="display:flex;align-items:center;gap:7px"><i data-lucide="chevron-right" width="13" height="13" class="chev" style="flex:none;transition:transform .12s ease"></i>${esc(l.name) || esc(tr("leads.sinNombre"))}</span>` },
    { h: esc(tr("leads.colContacto")), w: "minmax(110px,1fr)", cell: (l) => `<span class="text-muted">${esc(l.contact) || "—"}</span>` },
  ];
  if (niche.columns.length) {
    for (const c of niche.columns) {
      cols.push({ h: esc(tr(c.labelKey)), w: "minmax(78px,.85fr)", cell: (_l, meta) => `<span class="text-muted truncate">${esc(meta[c.key]) || "—"}</span>` });
    }
  } else {
    cols.push({ h: esc(tr("leads.colResumen")), w: "minmax(200px,1.8fr)", cell: (l) => `<span class="text-muted truncate">${esc(l.intent)}</span>` });
  }
  cols.push({
    h: esc(tr("leads.colEstado")),
    w: "132px",
    cell: (l) => `<form method="POST" action="/admin/leads/${l.id}/status" onclick="event.stopPropagation()">
      <select name="status" onchange="this.form.submit()"
              style="width:100%;background:var(--bg);border:1px solid var(--line);color:var(--cream);padding:6px 8px;font-size:11px;outline:none;cursor:pointer">
        ${(["new", "contacted", "sold", "lost"] as const)
          .map((s) => `<option ${l.status === s ? "selected" : ""} value="${s}">${esc(statusLabel(s))}</option>`)
          .join("")}
      </select>
    </form>`,
  });

  const gridCols = cols.map((c) => c.w).join(" ");
  const minWidth = 640 + niche.columns.length * 90; // asegura el scroll horizontal cuando hay muchas columnas

  const rows = list
    .map((l) => {
      const meta = leadMetadata(l);
      const fullDate = new Date(l.created_at).toLocaleString("es-MX");
      const convLink = l.conversation_id
        ? `<a href="/admin/conversations?c=${encodeURIComponent(l.conversation_id)}" class="text-accent" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;text-decoration:none">
             <i data-lucide="messages-square" width="13" height="13"></i> Ver conversación completa
           </a>`
        : `<span class="text-dim" style="font-size:11.5px">${esc(tr("leads.sinConversacion"))}</span>`;
      // Detalle: todos los campos del nicho (metadata) + resumen IA + notas.
      const metaRows = Object.entries(meta)
        .map(([k, v]) => `<span class="text-muted" style="font-size:12px"><span class="text-dim">${esc(k)}:</span> ${esc(v)}</span>`)
        .join("");
      return `<div class="lead" style="border-top:1px solid var(--line)">
        <div class="leadrow" onclick="var d=this.parentNode.querySelector('.lead-detail');var open=d.style.display==='block';d.style.display=open?'none':'block';this.querySelector('.chev').style.transform=open?'rotate(0deg)':'rotate(90deg)'"
             style="display:grid;grid-template-columns:${gridCols};gap:12px;padding:13px 18px;font-size:12.5px;align-items:center;cursor:pointer">
          ${cols.map((c) => c.cell(l, meta)).join("")}
        </div>
        <div class="lead-detail" style="display:none;padding:4px 18px 20px 18px;background:var(--bg)">
          <div style="max-width:760px;display:flex;flex-direction:column;gap:14px;padding-top:14px">
            ${metaRows ? `<div><div style="font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:6px">${esc(tr("leads.seccionDatos"))}</div><div style="display:flex;flex-wrap:wrap;gap:6px 18px">${metaRows}</div></div>` : ""}
            <div>
              <div style="font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:6px">${esc(tr("leads.seccionResumenIa"))}</div>
              <div class="text-cream" style="font-size:13px;line-height:1.55;white-space:pre-wrap">${esc(l.intent)}</div>
            </div>
            ${l.notes ? `<div>
              <div style="font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:6px">${esc(tr("leads.seccionNotas"))}</div>
              <div class="text-muted" style="font-size:12.5px;line-height:1.5;white-space:pre-wrap">${esc(l.notes)}</div>
            </div>` : ""}
            <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding-top:2px">
              ${convLink}
              <span class="text-dim" style="font-size:11.5px;display:inline-flex;align-items:center;gap:6px"><i data-lucide="clock" width="12" height="12"></i>${fullDate}</span>
              <form method="POST" action="/admin/leads/${l.id}/delete" style="margin-left:auto"
                    onsubmit="return confirm('¿Borrar este registro para siempre? No se puede deshacer.')">
                <button type="submit" class="text-dim" style="background:none;border:none;padding:0;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;cursor:pointer">
                  <i data-lucide="trash-2" width="12" height="12"></i> Borrar
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  // Empty-state de primer uso: explica que se llena solo cuando el bot detecta
  // un registro en una conversación. "cada" evita tener que resolver el género
  // de niche.recordSingular (Cita/Lead/Pedido/Reserva…).
  const empty =
    filtro.modo === "ninguno"
      ? `<div style="padding:48px 18px;text-align:center">
    <i data-lucide="user-x" width="24" height="24" style="color:var(--dim);margin:0 auto 12px;display:block"></i>
    <div class="text-[13px]" style="color:var(--muted);font-weight:600">No hay nada que mostrarte</div>
    <div class="text-dim text-[11.5px]" style="margin:5px auto 0;line-height:1.5;max-width:420px">${esc(filtro.motivo)}</div>
  </div>`
      : `<div style="padding:48px 18px;text-align:center">
    <i data-lucide="${esc(niche.navIcon)}" width="24" height="24" style="color:var(--dim);margin:0 auto 12px;display:block"></i>
    <div class="text-[13px]" style="color:var(--muted);font-weight:600">Aún no hay ${esc(recordPlural.toLowerCase())}</div>
    <div class="text-dim text-[11.5px]" style="margin:5px auto 0;line-height:1.5;max-width:380px">${esc(tr("leads.vacioDetalle")).replace("{tipo}", esc(recordSingular.toLowerCase()))}</div>
  </div>`;
  const header = cols
    .map((c) => `<span>${esc(c.h)}</span>`)
    .join("");

  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 class="font-display font-semibold text-[15px] text-cream">${esc(recordPlural)}${
        // Con dos asesores compartiendo el bot, hay que dejar clarísimo de quién
        // es la lista que se está viendo: si no, el que ve pocos leads cree que
        // el bot no está jalando.
        filtro.modo === "asesor"
          ? ` <span class="text-dim" style="font-weight:400;font-size:12.5px">· ${esc(filtro.nombre)}</span>`
          : ""
      }</h2>
      <a href="/admin/leads/export.csv" class="ghostbtn" style="display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);color:var(--muted);padding:9px 14px;font-size:12.5px;transition:all .12s ease">
        <i data-lucide="download" width="14" height="14"></i> Exportar CSV
      </a>
    </div>
    <div class="bg-panel border border-line" style="overflow-x:auto">
      <div style="min-width:${minWidth}px">
        <div style="display:grid;grid-template-columns:${gridCols};gap:12px;padding:10px 18px;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)">
          ${header}
        </div>
        ${list.length ? rows : empty}
      </div>
    </div>`;
  return layout({ title: recordPlural, activeTab: "leads", body, env });
}

export async function exportLeadsCsv(env: Env): Promise<string> {
  const tr = traductor(env);
  const leads = new LeadsRepo(new Db(env.DB));
  // El CSV respeta el MISMO filtro que la pantalla. Sin esto, el botón
  // "Exportar" sería la puerta de atrás para bajarse los prospectos del otro
  // asesor completos, con teléfono y todo.
  const filtro = filtroDeLeads(env as unknown as { PANEL_ROLE?: string; PANEL_EMAIL?: string });
  const list = filtro.modo === "ninguno" ? [] : await leads.list(10_000, undefined, argDeFiltro(filtro));
  const header = "fecha,nombre,contacto,intent,status,notas,metadata\n";
  const rows = list.map((l) => {
    const date = new Date(l.created_at).toISOString();
    const esc = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
    return `${date},${esc(l.name)},${esc(l.contact)},${esc(l.intent)},${l.status},${esc(l.notes)},${esc(l.metadata)}`;
  }).join("\n");
  return header + rows;
}

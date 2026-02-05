let items = [];
let activeIndex = 0;

const nodesEl = document.getElementById("nodes");
const progressEl = document.getElementById("progress");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Modal refs
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalBadge = document.getElementById("modalBadge");
const modalTitle = document.getElementById("modalTitle");
const modalSummary = document.getElementById("modalSummary");
const modalContent = document.getElementById("modalContent");
const modalMedia = document.getElementById("modalMedia");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
const modalPeriod = document.getElementById("modalPeriod");
const modalId = document.getElementById("modalId");
const modalChip = document.getElementById("modalChip");

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function setProgress(index){
  const pct = (items.length <= 1) ? 100 : (index / (items.length - 1)) * 100;
  progressEl.style.width = pct + "%";
}

function updateNavButtons(){
  const atStart = activeIndex === 0;
  const atEnd = activeIndex === items.length - 1;

  prevBtn.disabled = atStart;
  nextBtn.disabled = atEnd;

  prevBtn.classList.toggle("is-active", !atStart);
  nextBtn.classList.toggle("is-active", !atEnd);

  modalPrev.disabled = atStart;
  modalNext.disabled = atEnd;

  modalPrev.classList.toggle("is-active", !atStart);
  modalNext.classList.toggle("is-active", !atEnd);
}

function setActive(index, {focusNode=false} = {}){
  activeIndex = clamp(index, 0, items.length - 1);

  const nodes = [...nodesEl.querySelectorAll(".node")];
  nodes.forEach((n, i) => n.setAttribute("aria-selected", i === activeIndex ? "true" : "false"));

  setProgress(activeIndex);
  updateNavButtons();

  if(focusNode){
    nodes[activeIndex]?.focus?.();
  }
}

function renderTimeline(){
  nodesEl.innerHTML = items.map((it, i) => `
    <div class="node"
         role="tab"
         tabindex="0"
         aria-selected="${i === 0 ? "true" : "false"}"
         data-index="${i}"
         style="--c:${it.color}; --c-soft:${it.soft};">

      <div class="flag" aria-hidden="true">${it.tag ?? ""}</div>
      <div class="dot" aria-hidden="true">${it.num ?? (i+1)}</div>

      <div class="miniTitle">${it.title ?? "Sin título"}</div>
      <div class="miniSummary">${it.summary ?? ""}</div>
    </div>
  `).join("");
}

function formatContent(text){
  const safe = (text ?? "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const blocks = safe.split("\n\n").map(p => p.trim()).filter(Boolean);
  return blocks.map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
}

function renderModal(index){
  const it = items[index];

  modalBadge.style.background = it.color || "#6f86ff";
  modalBadge.textContent = it.num ?? (index + 1);

  modalTitle.textContent = it.title ?? "Título";
  modalSummary.textContent = it.summary ?? "";

  modalContent.innerHTML = formatContent(it.content);

  modalPeriod.textContent = it.tag ?? "—";
  modalId.textContent = it.id ?? "—";
  modalChip.textContent = it.tag ? `Periodo: ${it.tag}` : "Recurso";

  if(it.image && it.image.trim()){
    modalMedia.innerHTML = `<img class="media" src="${it.image}" alt="${it.title ?? "Imagen"}" loading="lazy" />`;
  } else {
    modalMedia.innerHTML = `<div class="imgph">Aquí va tu imagen<br/>(${it.id ?? "sin-id"}.jpg/png)</div>`;
  }

  updateNavButtons();
}

function openModal(index){
  renderModal(index);
  modalOverlay.classList.add("is-open");
  modalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  modalClose.focus();
}

function closeModal(){
  modalOverlay.classList.remove("is-open");
  modalOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function modalGo(delta){
  const next = clamp(activeIndex + delta, 0, items.length - 1);
  setActive(next);
  renderModal(next);
}

prevBtn.addEventListener("click", () => setActive(activeIndex - 1, {focusNode:true}));
nextBtn.addEventListener("click", () => setActive(activeIndex + 1, {focusNode:true}));

modalPrev.addEventListener("click", () => modalGo(-1));
modalNext.addEventListener("click", () => modalGo(1));

modalClose.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (e) => {
  const inside = e.target.closest(".modal");
  if(!inside) closeModal();
});

nodesEl.addEventListener("click", (e) => {
  const node = e.target.closest(".node");
  if(!node) return;
  const idx = Number(node.dataset.index);
  setActive(idx);
  openModal(idx);
});

nodesEl.addEventListener("keydown", (e) => {
  const node = e.target.closest(".node");
  if(!node) return;

  if(e.key === "Enter" || e.key === " "){
    e.preventDefault();
    const idx = Number(node.dataset.index);
    setActive(idx);
    openModal(idx);
  }
});

window.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && modalOverlay.classList.contains("is-open")){
    closeModal();
    return;
  }

  if(modalOverlay.classList.contains("is-open")){
    if(e.key === "ArrowLeft") modalGo(-1);
    if(e.key === "ArrowRight") modalGo(1);
    return;
  }

  if(e.key === "ArrowLeft") setActive(activeIndex - 1, {focusNode:true});
  if(e.key === "ArrowRight") setActive(activeIndex + 1, {focusNode:true});
  if(e.key === "Enter") openModal(activeIndex);
});

// Fallback por si datita.json no carga
const FALLBACK = [
  {
    id:"hito-demo",
    num:1,
    tag:"Demo",
    color:"#6f86ff",
    soft:"#dfe6ff",
    title:"No cargó datita.json",
    summary:"Fallback para que nunca se vea vacío.",
    content:"Causas comunes:\n\n1) No estás usando servidor local.\n2) datita.json no está al lado de index.html.\n3) El nombre no coincide.\n\nSolución: usa Live Server o 'python -m http.server'.",
    image:""
  }
];

async function init(){
  try{
    const res = await fetch("./datita.json", { cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status} cargando datita.json`);
    items = await res.json();

    if(!Array.isArray(items) || items.length === 0){
      throw new Error("datita.json no es un array o está vacío");
    }
  } catch(err){
    console.error("Error cargando datita.json:", err);
    items = FALLBACK;
  }

  renderTimeline();
  setActive(0);
  setProgress(0);
}

init();

/* linkedin.js — LinkedIn for iOS (2026) feed post + article reader screens. Exposes window.LI.
   Cells: { type:"post"|"article", author, text, expanded, carousel:{prefix,pages,title}, articleTitle, articleBody } */
(function () {
  const C = window.CORE, esc = C.esc;
  const D = new Proxy({}, { get: (_, k) => C.D[k] });
  const I = {
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(0,0,0,.6)"><path d="M21.4 20l-5.2-5.2A7.9 7.9 0 0 0 18 10a8 8 0 1 0-8 8 7.9 7.9 0 0 0 4.8-1.6L20 21.4zM4 10a6 6 0 1 1 6 6 6 6 0 0 1-6-6z"/></svg>',
    msg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,.6)"><path d="M16 4H8a7 7 0 0 0 0 14h4v4l5-4.2A7 7 0 0 0 16 4zm0 12h-4.7L10 17.1V16H8a5 5 0 0 1 0-10h8a5 5 0 0 1 0 10z"/></svg>',
    more: '<svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(0,0,0,.6)"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    globe: '<svg width="12" height="12" viewBox="0 0 16 16" fill="rgba(0,0,0,.6)"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm4.7 4h-1.9a10 10 0 0 0-1-2.5A5.6 5.6 0 0 1 12.7 5zM8 2.4c.6.7 1.1 1.6 1.4 2.6H6.6c.3-1 .8-1.9 1.4-2.6zM2.6 9.4a5.5 5.5 0 0 1 0-2.8h2.2a11 11 0 0 0 0 2.8zm.7 1.4h1.9c.2.9.6 1.7 1 2.5A5.6 5.6 0 0 1 3.3 10.8zm1.9-5.6H3.3a5.6 5.6 0 0 1 2.9-2.5c-.4.8-.8 1.6-1 2.5zM8 13.6c-.6-.7-1.1-1.6-1.4-2.6h2.8c-.3 1-.8 1.9-1.4 2.6zm1.7-4.2H6.3a9.6 9.6 0 0 1 0-2.8h3.4a9.6 9.6 0 0 1 0 2.8zm.2 3.9c.4-.8.8-1.6 1-2.5h1.9a5.6 5.6 0 0 1-2.9 2.5zm1.3-3.9a11 11 0 0 0 0-2.8h2.2a5.5 5.5 0 0 1 0 2.8z"/></svg>',
    like: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1.6" stroke-linejoin="round"><path d="M7 10v11H3V10zM7 10l4.5-7a2 2 0 0 1 2 2.5L12.7 10H19a2 2 0 0 1 2 2.4l-1.6 6.4A2.5 2.5 0 0 1 17 21H7"/></svg>',
    comment: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1.6" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    repost: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V7a2 2 0 0 1 2-2h11l-3-3M20 15v2a2 2 0 0 1-2 2H7l3 3"/></svg>',
    send: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1.6" stroke-linejoin="round"><path d="M3 3l18 9-18 9 3-9z"/><path d="M6 12h15"/></svg>',
    home: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M12 3l9 8h-2.5v9H14v-6h-4v6H5.5v-9H3z"/></svg>',
    net: '<svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,.6)"><circle cx="8" cy="8" r="3.2"/><path d="M2 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5z"/><circle cx="17" cy="9" r="2.5"/><path d="M15.3 13.7c3 .2 5.7 2.1 5.7 5.3h-4.8c0-2-.4-3.8-1.3-5.3z"/></svg>',
    post: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>',
    bell: '<svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,.6)"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1z"/></svg>',
    jobs: '<svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,.6)"><path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4z"/></svg>',
    back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.8)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H5"/><path d="M11 6l-6 6 6 6"/></svg>',
    expand: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z"/></svg>',
    reactions: '<span class="li-react"><i class="r like"></i><i class="r love"></i><i class="r idea"></i></span>'
  };
  const person = (key) => D.people[key] || D.people.sender;
  const av = (p, size, square) => `<span class="av ${square ? "sq" : ""}" style="width:${size}px;height:${size}px;background:${p.color};font-size:${Math.round(size * .4)}px;border-radius:${square ? "4px" : "50%"}">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc(p.initials)}</span>`;

  const topBar = () => `<div class="li-top">${av(D.people.me, 32)}<div class="li-search">${I.search}<span>Search</span></div><span class="li-ic">${I.msg}</span></div>`;
  const tabBar = () => `<div class="li-tabs"><div class="li-tab on">${I.home}<span>Home</span></div><div class="li-tab">${I.net}<span>My Network</span></div><div class="li-tab">${I.post}<span>Post</span></div><div class="li-tab">${I.bell}<span>Notifications</span></div><div class="li-tab">${I.jobs}<span>Jobs</span></div></div>`;

  function hashtagify(html) { return html.replace(/(^|\s)(#[A-Za-z0-9_]+)/g, '$1<span class="li-tag">$2</span>'); }
  function postText(cell) {
    const html = hashtagify(C.rich(cell.text, "li-link")).replace(/\n/g, "<br>");
    if (cell.expanded) return `<div class="li-text">${html}</div>`;
    return `<div class="li-text clamp">${html}<span class="li-more" title="Show the full post">…more</span></div>`;
  }
  function carouselHtml(car) {
    if (!car) return "";
    const pages = [];
    const gid = "car-" + car.prefix.replace(/\W/g, "");
    for (let i = 1; i <= car.pages; i++) { const src = `${car.prefix}${String(i).padStart(2, "0")}.jpg`; pages.push(`<div class="li-slide"><img src="${esc(src)}" alt="${esc(car.title)} · page ${i}" data-lb="${esc(src)}" data-lb-group="${gid}" data-lb-caption="${esc(car.title)} · page ${i} of ${car.pages}"></div>`); }
    return `<div class="li-doc"><div class="li-doc-head"><span class="li-doc-title">${esc(car.title)}</span><span class="li-doc-pages">${car.pages} pages</span></div>
      <div class="li-doc-view"><div class="li-slides" data-pages="${car.pages}">${pages.join("")}</div><span class="li-pg">1 / ${car.pages}</span><span class="li-exp" title="View full screen">${I.expand}</span><button class="li-arr prev" data-dir="-1" title="Previous slide">‹</button><button class="li-arr next" data-dir="1" title="Next slide">›</button></div></div>`;
  }
  function videoHtml(v) {
    return `<div class="li-video"><video class="media-video" controls playsinline preload="metadata" src="${esc(v.src)}"${v.poster ? ` poster="${esc(v.poster)}"` : ""}></video></div>`;
  }
  function articleCard(cell) {
    return `<div class="li-art"><div class="li-art-cover"><span>${esc(cell.articleTitle)}</span></div><div class="li-art-meta"><div class="li-art-t">${esc(cell.articleTitle)}</div><div class="li-art-s">${esc(cell.articleSource || "bighammer.ai")} · ${esc(cell.readTime || "3 min read")}</div></div></div>`;
  }
  function postCard(cell) {
    const p = person(cell.author);
    const isCo = !!p.company;
    const sub = isCo ? `${esc(p.followers)} followers` : esc(p.headline);
    const media = cell.carousel ? carouselHtml(cell.carousel) : cell.video ? videoHtml(cell.video) : cell.image ? `<div class="li-imgpost"><img src="${esc(cell.image.src)}" alt="${esc(cell.image.alt || "")}" data-lb="${esc(cell.image.src)}" data-lb-caption="${esc(cell.image.alt || "")}"></div>` : (cell.articleTitle ? articleCard(cell) : "");
    const social = cell.social || D.socialDefault;
    return `<article class="li-post">
      <div class="li-head">${av(p, 48, isCo)}<div class="li-who"><div class="li-name">${esc(p.name)}${isCo ? "" : ' <span class="li-deg">· 1st</span>'}</div><div class="li-sub">${sub}</div><div class="li-sub">${esc(cell.age || "1d")} · ${I.globe}</div></div><span class="li-ic">${I.more}</span><span class="li-ic">${I.x}</span></div>
      ${postText(cell)}
      ${media}
      <div class="li-social"><span>${I.reactions} ${esc(social.reactors)}</span><span>${esc(social.comments)} comments · ${esc(social.reposts)} reposts</span></div>
      <div class="li-actions"><span>${I.like}Like</span><span>${I.comment}Comment</span><span>${I.repost}Repost</span><span>${I.send}Send</span></div>
    </article>`;
  }
  function feedScreen(cell) {
    const f = D.feedFiller || [];
    return `${C.statusBar()}${topBar()}<div class="scroll li-feed">${postCard(cell)}${f.map(x => postCard(x)).join("")}</div>${tabBar()}${C.home()}`;
  }
  function articleScreen(cell) {
    const p = person(cell.author);
    const body = cell.articleBody.split(/\n{2,}/).map(par => {
      const lines = par.split("\n");
      if (lines.every(l => /^[•\-]\s/.test(l))) return `<ul>${lines.map(l => `<li>${C.rich(l.replace(/^[•\-]\s/, ""), "li-link")}</li>`).join("")}</ul>`;
      if (/^##\s/.test(par)) return `<h3>${esc(par.replace(/^##\s/, ""))}</h3>`;
      return `<p>${C.rich(par, "li-link").replace(/\n/g, "<br>")}</p>`;
    }).join("");
    return `${C.statusBar()}
      <div class="li-nav"><span class="li-ic">${I.back}</span><span class="li-sp"></span><span class="li-ic">${I.send}</span><span class="li-ic">${I.more}</span></div>
      <div class="scroll li-reader"><div class="li-cover"><span>${esc(cell.articleTitle)}</span></div>
        <h1>${esc(cell.articleTitle)}</h1>
        <div class="li-byline">${av(p, 40)}<div><div class="li-name">${esc(p.name)}</div><div class="li-sub">${esc(p.headline || p.followers + " followers")}</div><div class="li-sub">${esc(cell.age || "1d")}</div></div><span class="li-follow">+ Follow</span></div>
        <div class="li-body">${body}</div>
        <div class="li-social"><span>${I.reactions} ${esc((cell.social || D.socialDefault).reactors)}</span></div>
        <div class="li-actions"><span>${I.like}Like</span><span>${I.comment}Comment</span><span>${I.repost}Repost</span><span>${I.send}Send</span></div>
      </div>${C.home()}`;
  }
  function afterRender() {
    // swipe support for document carousels: keep the page counter in sync
    document.querySelectorAll(".li-slides").forEach(s => s.addEventListener("scroll", () => {
      const pg = Math.round(s.scrollLeft / s.clientWidth) + 1;
      s.parentElement.querySelector(".li-pg").textContent = `${pg} / ${s.dataset.pages}`;
    }));
  }
  /* interactions: …more expands the post inline; arrows move the carousel; the expand icon opens the full-screen viewer */
  document.addEventListener("click", (e) => {
    const more = e.target.closest(".li-more");
    if (more) { const t = more.closest(".li-text"); t.classList.remove("clamp"); more.remove(); return; }
    const arr = e.target.closest(".li-arr");
    if (arr) { const s = arr.parentElement.querySelector(".li-slides"); s.scrollBy({ left: +arr.dataset.dir * s.clientWidth, behavior: "smooth" }); return; }
    const exp = e.target.closest(".li-exp");
    if (exp) { const s = exp.parentElement.querySelector(".li-slides"); const imgs = [...s.querySelectorAll("img")]; const pg = Math.round(s.scrollLeft / s.clientWidth); C.lightbox(imgs.map(im => ({ src: im.dataset.lb, caption: im.dataset.lbCaption })), pg); }
  });
  window.LI = { feedScreen, articleScreen, afterRender, I, av };
})();

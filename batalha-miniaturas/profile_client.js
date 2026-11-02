/* v2.14.1 — Perfil compacto: o avatar abre o seletor; elo sem resultado fictício. */
(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
#homeMenu .realm-account-form[data-account-form="profile"] > .realm-avatar-grid,
#homeMenu .realm-account-form[data-account-form="profile"] > strong { display:none; }
#homeMenu .realm-account-form[data-account-form="profile"].mini-avatar-open > .realm-avatar-grid {display:grid;}
#homeMenu .realm-account-form[data-account-form="profile"].mini-avatar-open > strong {display:block;}
#homeMenu .mini-avatar-trigger {position:relative;flex:none;display:block;padding:0;border:0;background:transparent;cursor:pointer;border-radius:50%;line-height:0;}
#homeMenu .mini-avatar-trigger:focus-visible {outline:3px solid #f4ce8b;outline-offset:4px;}
#homeMenu .mini-avatar-trigger img {display:block;}
#homeMenu .mini-avatar-pencil {position:absolute;right:-4px;bottom:-4px;display:grid;place-items:center;width:28px;height:28px;line-height:1;border:2px solid #dab67b;border-radius:50%;background:#243f5a;color:#ffdd9f;font-size:15px;box-shadow:0 2px 8px #0008;}
#homeMenu .mini-elo {display:flex;gap:12px;align-items:center;padding:12px 14px;border:1px solid #8c754e;border-radius:12px;background:linear-gradient(110deg,#233852,#14273e);}
#homeMenu .mini-elo-shield {display:grid;place-items:center;flex:none;width:48px;height:52px;color:#dbb979;font-size:29px;background:#30465b;border:1px solid #b99760;clip-path:polygon(50% 0%,94% 17%,90% 73%,50% 100%,10% 73%,6% 17%);}
#homeMenu .mini-elo-body {display:grid;gap:4px;min-width:0;}
#homeMenu .mini-elo-label {color:#bcd0e1;text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:800;}
#homeMenu .mini-elo-name {color:#ffdfaa;font-family:Georgia,serif;font-size:clamp(19px,5vw,24px);font-weight:800;}
#homeMenu .mini-elo-help {color:#bfd0df;font-size:12px;line-height:1.3;}
@media (max-width:390px) {#homeMenu .mini-elo {gap:9px;padding:10px;}#homeMenu .mini-elo-shield{width:42px;height:46px;}}
`;
  document.head.appendChild(style);

  const rankMarkup = '<div class="mini-elo" role="status" aria-label="Elo ranqueado: não classificado">' +
    '<span class="mini-elo-shield" aria-hidden="true">🛡️</span>' +
    '<div class="mini-elo-body"><span class="mini-elo-label">Elo ranqueado</span>' +
    '<span class="mini-elo-name">Não classificado</span>' +
    '<span class="mini-elo-help">Sua divisão aparecerá aqui quando o ranqueado estiver disponível.</span></div></div>';

  let currentPanel = null;
  let avatarOpen = false;
  function enhance() {
    const panel = document.getElementById('realmAccountPanel');
    if (panel !== currentPanel) { currentPanel = panel; avatarOpen = false; }
    if (!panel) return;
    const profileForm = panel.querySelector('form[data-account-form="profile"]');
    const heading = panel.querySelector('.realm-account-heading');
    if (!profileForm || !heading) return; // Não alterar cadastro ou login.

    if (!panel.querySelector('.mini-elo')) heading.insertAdjacentHTML('afterend', rankMarkup);
    let trigger = heading.querySelector('.mini-avatar-trigger');
    if (!trigger) {
      const avatarImage = heading.querySelector('img');
      if (avatarImage) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'mini-avatar-trigger';
        trigger.setAttribute('aria-label', 'Escolher outro avatar');
        trigger.setAttribute('aria-expanded', String(avatarOpen));
        avatarImage.replaceWith(trigger);
        trigger.appendChild(avatarImage);
        const pencil = document.createElement('span');
        pencil.className = 'mini-avatar-pencil';
        pencil.setAttribute('aria-hidden', 'true');
        pencil.textContent = '✎';
        trigger.appendChild(pencil);
      }
    }
    profileForm.classList.toggle('mini-avatar-open', avatarOpen);
    if (trigger) trigger.setAttribute('aria-expanded', String(avatarOpen));
  }
  document.addEventListener('click', ev => {
    const trigger = ev.target.closest?.('#realmAccountPanel .mini-avatar-trigger');
    if (trigger) {
      avatarOpen = !avatarOpen;
      enhance();
      if (avatarOpen) document.querySelector('#realmAccountPanel .realm-avatar-grid')?.scrollIntoView({block:'nearest',behavior:'smooth'});
      return;
    }
    const chosen = ev.target.closest?.('#realmAccountPanel form[data-account-form="profile"] [data-account-avatar]');
    if (chosen) {
      const img = chosen.querySelector('img');
      const photo = document.querySelector('#realmAccountPanel .mini-avatar-trigger img');
      if (photo && img) photo.src = img.src; // Prévia. O botão Salvar confirma no servidor.
      avatarOpen = false;
      enhance();
    }
  });
  document.addEventListener('submit', ev => {
    if (ev.target.matches?.('#realmAccountPanel form[data-account-form="profile"]')) avatarOpen = false;
  }, true);

  const menu = document.getElementById('homeTabContent');
  if (menu) new MutationObserver(enhance).observe(menu, {childList:true,subtree:true});
  enhance();
})();

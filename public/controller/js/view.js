export default class View {
  onLoad() {
    this.changeCommandBtnVisibility();
  }

  changeCommandBtnVisibility(hide = true) {
    Array.from(document.querySelectorAll('[name=command]')).forEach((btn) => {
      const fn = hide ? 'add' : 'remove';

      btn.classList[fn]('unassigned');

      function onClickReset() {}

      btn.onclick = onClickReset;
    });
  }
}

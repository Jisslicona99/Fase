// Ocultar el loader cuando la página haya terminado de cargar
$(window).on("load", function () {
  $(".loader_bg").fadeOut("slow");
});

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', e => {
      e.preventDefault();
      const usuario = JSON.parse(localStorage.getItem('usuario'));
      if (usuario) {
        localStorage.removeItem('usuario');
        localStorage.removeItem(`carrito_${usuario.username}`);
      }
      localStorage.removeItem('carrito');
      window.location.reload();
    });
  }
});

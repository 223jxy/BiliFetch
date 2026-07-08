(function () {
  const header = document.querySelector("[data-header]");
  const updateHeader = () => {
    if (!header) {
      return;
    }
    header.classList.toggle("is-solid", window.scrollY > 18);
  };

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
})();

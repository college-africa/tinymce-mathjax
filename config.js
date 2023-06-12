(() => {
  let className = 'math-tex';
  if (document.currentScript) {
    const urlParts = document.currentScript.getAttribute('src').split('?');
    if (urlParts[1]) {
      const queryParams = urlParts[1].split('&');
      for (const element of queryParams) {
        const param = element.split('=');
        if (param[0] == 'class') {
          className = param[1];
          break;
        }
      }
    }
  }

  window.MathJax = {
    options: {
      processHtmlClass: className,
      ignoreHtmlClass: '.*',
    },
    loader: { load: ['input/asciimath', 'output/chtml', 'ui/menu'] },
  };
})();

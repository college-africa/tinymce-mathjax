window.tinymce.PluginManager.add('mathjax', function (editor, url) {
  // plugin configuration options
  const settings = editor.getParam('mathjax');
  const mathjaxClassName = settings.className || 'math-tex';
  const mathjaxTempClassName = mathjaxClassName + '-original';
  const mathjaxSymbols = settings.symbols || { start: '\\(', end: '\\)' };
  const mathjaxUrl = settings.lib || null;
  const mathjaxConfigUrl =
    (settings.configUrl || url + '/config.js') +
    '?class=' +
    mathjaxTempClassName;
  const mathjaxScripts = [mathjaxConfigUrl];
  if (mathjaxUrl) {
    mathjaxScripts.push(mathjaxUrl);
  }

  // load mathjax and its config on editor init
  editor.on('init', function () {
    const scripts = editor.getDoc().getElementsByTagName('script');
    for (const element of mathjaxScripts) {
      // check if script have already loaded
      const id = editor.dom.uniqueId();
      const script = editor.dom.create('script', {
        id: id,
        type: 'text/javascript',
        src: element,
      });
      let found = false;
      for (const element of scripts) {
        if (element.src == script.src) {
          found = true;
          break;
        }
      }
      // load script
      if (!found) {
        editor.getDoc().getElementsByTagName('head')[0].appendChild(script);
      }
    }
  });

  // remove extra tags on get content
  editor.on('GetContent', function (e) {
    const div = editor.dom.create('div');
    div.innerHTML = e.content;
    const elements = div.querySelectorAll('.' + mathjaxClassName);
    for (const element of elements) {
      const children = element.querySelectorAll('span');
      for (const child of children) {
        child.remove();
      }
      const latex = element.getAttribute('data-latex');
      element.removeAttribute('contenteditable');
      element.removeAttribute('style');
      element.removeAttribute('data-latex');
      element.innerHTML = latex;
    }
    e.content = div.innerHTML;
  });

  const checkElement = function (element) {
    if (element.childNodes.length != 2) {
      element.setAttribute('contenteditable', false);
      element.style.cursor = 'pointer';
      const latex = element.getAttribute('data-latex') || element.innerHTML;
      element.setAttribute('data-latex', latex);
      element.innerHTML = '';

      const math = editor.dom.create('span');
      math.innerHTML = latex;
      math.classList.add(mathjaxTempClassName);
      element.appendChild(math);

      const dummy = editor.dom.create('span');
      dummy.classList.add('dummy');
      dummy.innerHTML = 'dummy';
      dummy.setAttribute('hidden', 'hidden');
      element.appendChild(dummy);
    }
  };

  // add dummy tag on set content
  editor.on('BeforeSetContent', function (e) {
    const div = editor.dom.create('div');
    div.innerHTML = e.content;
    const elements = div.querySelectorAll('.' + mathjaxClassName);
    for (const element of elements) {
      checkElement(element);
    }
    e.content = div.innerHTML;
  });

  // refresh mathjax on set content
  editor.on('SetContent', function (e) {
    if (editor.getDoc().defaultView.MathJax) {
      editor.getDoc().defaultView.MathJax.startup.getComponents();
      editor.getDoc().defaultView.MathJax.typeset();
    }
  });

  // refresh mathjax on any content change
  editor.on('Change', function (data) {
    const elements = editor.dom
      .getRoot()
      .querySelectorAll('.' + mathjaxClassName);
    if (elements.length) {
      for (const element of elements) {
        checkElement(element);
      }
      if (editor.getDoc().defaultView.MathJax) {
        editor.getDoc().defaultView.MathJax.startup.getComponents();
        editor.getDoc().defaultView.MathJax.typeset();
      }
    }
  });

  // add button to tinimce
  editor.ui.registry.addToggleButton('mathjax', {
    text: 'Σ',
    tooltip: 'Mathjax',
    onAction: function () {
      const selected = editor.selection.getNode();
      let target = undefined;
      if (selected.classList.contains(mathjaxClassName)) {
        target = selected;
      }
      openMathjaxEditor(target);
    },
    onSetup: function (buttonApi) {
      return editor.selection.selectorChangedWithUnbind(
        '.' + mathjaxClassName,
        buttonApi.setActive
      ).unbind;
    },
  });

  // handle click on existing
  editor.on('click', function (e) {
    const closest = e.target.closest('.' + mathjaxClassName);
    if (closest) {
      openMathjaxEditor(closest);
    }
  });

  // open window with editor
  const openMathjaxEditor = function (target) {
    const mathjaxId = editor.id + '_' + editor.dom.uniqueId();

    let latex = '';
    if (target) {
      const latex_attribute = target.getAttribute('data-latex');
      if (
        latex_attribute.length >=
        (mathjaxSymbols.start + mathjaxSymbols.end).length
      ) {
        latex = latex_attribute.substr(
          mathjaxSymbols.start.length,
          latex_attribute.length -
            (mathjaxSymbols.start + mathjaxSymbols.end).length
        );
      }
    }

    // show new window
    editor.windowManager.open({
      title: 'Mathjax',
      width: 600,
      height: 300,
      body: {
        type: 'panel',
        items: [
          {
            type: 'textarea',
            name: 'title',
            label: 'LaTex',
          },
          {
            type: 'htmlpanel',
            html: '<div style="text-align:right"><a href="https://wikibooks.org/wiki/LaTeX/Mathematics" target="_blank" style="font-size:small">LaTex</a></div>',
          },
          {
            type: 'htmlpanel',
            html:
              '<iframe id="' +
              mathjaxId +
              '" style="width: 100%; min-height: 50px;"></iframe>',
          },
        ],
      },
      buttons: [{ type: 'submit', text: 'OK' }],
      onSubmit: function onsubmit(api) {
        const value = api.getData().title.trim();
        if (target) {
          target.innerHTML = '';
          target.setAttribute('data-latex', getMathText(value));
          checkElement(target);
        } else {
          const newElement = editor.getDoc().createElement('span');
          newElement.innerHTML = getMathText(value);
          newElement.classList.add(mathjaxClassName);
          checkElement(newElement);
          editor.insertContent(newElement.outerHTML);
        }
        editor.getDoc().defaultView.MathJax.startup.getComponents();
        editor.getDoc().defaultView.MathJax.typeset();
        api.close();
      },
      onChange: function (api) {
        var value = api.getData().title.trim();
        if (value != latex) {
          refreshDialogMathjax(value, document.getElementById(mathjaxId));
          latex = value;
        }
      },
      initialData: { title: latex },
    });

    // add scripts to iframe
    const iframe = document.getElementById(mathjaxId);
    const iframeWindow =
      iframe.contentWindow ||
      iframe.contentDocument.document ||
      iframe.contentDocument;
    const iframeDocument = iframeWindow.document;
    const iframeHead = iframeDocument.getElementsByTagName('head')[0];
    const iframeBody = iframeDocument.getElementsByTagName('body')[0];

    // get latex for mathjax from simple text
    const getMathText = function (value, symbols) {
      if (!symbols) {
        symbols = mathjaxSymbols;
      }
      return symbols.start + ' ' + value + ' ' + symbols.end;
    };

    // refresh latex in mathjax iframe
    const refreshDialogMathjax = function (latex) {
      const MathJax = iframeWindow.MathJax;
      let div = iframeBody.querySelector('div');
      if (!div) {
        div = iframeDocument.createElement('div');
        div.classList.add(mathjaxTempClassName);
        iframeBody.appendChild(div);
      }
      div.innerHTML = getMathText(latex, { start: '$$', end: '$$' });
      if (MathJax && MathJax.startup) {
        MathJax.startup.getComponents();
        MathJax.typeset();
      }
    };
    refreshDialogMathjax(latex);

    // add scripts for dialog iframe
    for (const script of mathjaxScripts) {
      const node = iframeWindow.document.createElement('script');
      node.src = script;
      node.type = 'text/javascript';
      node.async = false;
      node.charset = 'utf-8';
      iframeHead.appendChild(node);
    }
  };
});

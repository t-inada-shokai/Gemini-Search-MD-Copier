(function() {
  let markdownText = "";

  // 1. クラスに依存しない、不変性の高い属性（data-* / jsname）ベースで抽出を試みる
  markdownText = extractTargetedAiResponse();

  // 2. 万が一失敗した場合は、画面全体の汎用テキスト抽出（Fallback）へ回す
  if (!markdownText) {
    console.log("-> ターゲット領域が見つからないため、代替処理を実行します。");
    markdownText = extractFallbackChatResponse();
  }

  if (!markdownText) {
    alert("対象のAI回答が見つかりませんでした。ページを再読み込みするか、回答が完了してから再度お試しください。");
    return;
  }

  // Markdown装飾マーカーの判定とクリーンアップ
  markdownText = finalizeMarkdownStyles(markdownText);

  // クリップボードへ保存
  saveToClipboard(markdownText);

  // =============================================================
  // 内部関数：属性ベースで質問と回答を正確に射止める
  // =============================================================
  function extractTargetedAiResponse() {
    console.log("-> 属性ベース（data-xid等）の解析を開始します。");
    
    let resultText = "";
    const gemini = document.querySelector("chat-window-content");
    if (gemini) {
        // Gemini
        const chatPairs = gemini.querySelectorAll("div.conversation-container");
        if (chatPairs.length === 0) return null;

        chatPairs.forEach((pair, index) => {
          const questionBlock = pair.querySelector("div.query-content");
          let questionText = "（質問の取得に失敗）";
          if (questionBlock) {
            questionText = convertToMarkdownGemini(questionBlock);
            questionText = questionText.replace(/^あなたのプロンプト\s*/, "");
            // 先頭の ### 見出し記号を除去
            questionText = questionText.trim().replace(/^###\s*/, "");
            // プロンプトのサニタイズ
            questionText = sanitizePrompt(questionText);
            // アップロードファイル
            const importFileBlock = questionBlock.querySelectorAll("user-query-file-preview");
            if (importFileBlock.length !==0 ) {
              importFileBlock.forEach((block, index) => {
                const filename = block.querySelector('button.new-file-preview-file').getAttribute('aria-label');
                questionText += "\nUpload_File: \`"+filename+"\`\n";
              });
            }
          }

          const answerContainer = pair.querySelector("model-response");
          let answerText = "（回答の取得に失敗）";
          if (answerContainer) {
            answerText = convertToMarkdownGemini(answerContainer);
          }

          resultText += `## 質問 [${index + 1}]\n${questionText}\n\n### AIの回答\n${answerText}\n\n---\n\n`;
        });
    } else {
      const abstract = document.querySelector("[data-is-desktop='1']");
      if (abstract) {
        // AIによる概要（AIモードではなくすべて）
        const questionBlock = abstract.querySelector("[data-q]");
        let questionText = "（質問の取得に失敗）";
        if (questionBlock) {
          questionText = questionBlock.getAttribute('data-q');
          // プロンプトのサニタイズ
          questionText = sanitizePrompt(questionText);
        }

        const answerContainer = abstract.querySelector("[data-container-id='main-col']");
        let answerText = "（回答の取得に失敗）";
        if (answerContainer) {
          answerText = convertToMarkdown(answerContainer);
        }

        resultText += `## 質問\n${questionText}\n\n### AIの回答\n${answerText}\n\n---\n\n`;
      } else {
        // AIモード
        const chatPairs = document.querySelectorAll("[jsname='RH7zg']");
        if (chatPairs.length === 0) return null;

        chatPairs.forEach((pair, index) => {
          const questionBlock = pair.querySelector("[jsname='eFVkfb']");
          let questionText = "（質問の取得に失敗）";
          if (questionBlock) {
            questionText = convertToMarkdown(questionBlock);
            questionText = questionText.replace(/^あなたが話した内容:\s*/, "");
            // 先頭の ### 見出し記号を除去
            questionText = questionText.trim().replace(/^###\s*/, "");
            // プロンプトのサニタイズ
            questionText = sanitizePrompt(questionText);

            // アップロードファイル
            const importFileBlock = pair.querySelectorAll("[jsuid='LNxi5b_7']");
            if (importFileBlock.length !==0 ) {
              importFileBlock.forEach((block, index) => {
                const filename = block.querySelector('span>span').innerText;
                questionText += "\nUpload_File: \`"+filename+"\`\n";
              });
            }
          }

          const answerContainer = pair.querySelector("[data-container-id='main-col']");
          let answerText = "（回答の取得に失敗）";
          if (answerContainer) {
            answerText = convertToMarkdown(answerContainer);
          }

          resultText += `## 質問 [${index + 1}]\n${questionText}\n\n### AIの回答\n${answerText}\n\n---\n\n`;
        });
      }
    }

    return resultText.trim() ? resultText.trim() : null;
  }

  function extractFallbackChatResponse() {
    const elements = document.querySelectorAll("li, p, span, div");
    if (elements.length === 0) return null;

    let text = "## 画面テキストの自動抽出ログ\n\n";
    let hasContent = false;
    const addedTexts = new Set();

    elements.forEach((el) => {
      if (shouldIgnoreElement(el)) return;
      const content = el.innerText.trim();
      if (content.length > 2 && !content.includes("拡張機能ボタン") && !addedTexts.has(content)) {
        text += content + "\n\n---\n\n";
        addedTexts.add(content);
        hasContent = true;
      }
    });

    return hasContent ? text.trim() : null;
  }

  function saveToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => alert("Markdown形式でクリップボードにコピーしました！"))
      .catch(err => alert("コピーに失敗しました: " + err));
  }

  function escapeBackticks(text) {
    return text.replace(/`/g, '\\`');
  }

  // =============================================================
  // プロンプト専用のサニタイズ共通関数（ここで一括管理）
  // =============================================================
  function sanitizePrompt(text) {
    if (!text) return "";
    
    text = '\n```\n'+text+'\n```\n'; 
    
    return text;
  }

  function shouldIgnoreElement(element) {
    const tagName = element.tagName.toLowerCase();
    const classList = element.classList;
    const role = element.getAttribute('role');
    const jsname = element.getAttribute('jsname');

    if (tagName === 'button' || role === 'button') return true;
    if (jsname === 'i47Tu' || jsname === 'hc2akf') return true;
    if (classList.contains('z0e9Qd') || classList.contains('LIBz9e') || classList.contains('ub891') || classList.contains('DBd2Wb')) return true;
    if (tagName === 'span' && element.hasAttribute('data-animation-atomic')) return true;
    if (element.getAttribute('aria-label') === '関連リンクを表示') return true;

    const text = element.innerText ? element.innerText.trim() : '';
    if (text === 'コピー' || text.startsWith('公開リンクを共有') || text === '良い回答' || text === '悪い回答') {
      return true;
    }

    return false;
  }

  function shouldIgnoreElementGemini(element) {
    const tagName = element.tagName.toLowerCase();
    const classList = element.classList;
    const role = element.getAttribute('role');
    const jsname = element.getAttribute('jsname');

    if (classList.contains('code-block-decoration') && classList.contains('header-formatted')) return true;
    if (classList.contains('cdk-visually-hidden') && (classList.contains('screen-reader-user-query-label') || classList.contains('screen-reader-model-response-label'))) return true;
    if (tagName === 'span' && element.hasAttribute('data-animation-atomic')) return true;
    if (tagName === 'div' && element.classList.contains('file-preview-container')) return true;
    if (element.getAttribute('aria-label') === '関連リンクを表示') return true;

    const text = element.innerText ? element.innerText.trim() : '';
    if (text === 'コピー' || text.startsWith('公開リンクを共有') || text === '良い回答' || text === '悪い回答') {
      return true;
    }

    return false;
  }

  function getLeftPixels(element) {
    const style = window.getComputedStyle(element);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const marginLeft = parseFloat(style.marginLeft) || 0;
    return paddingLeft + marginLeft;
  }

  function normalizeStringForComparison(str) {
    if (!str) return "";
    return str
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/[－．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .trim();
  }

  // =============================================================
  // 内部処理用のプレースホルダーのクリーンアップ処理
  // =============================================================
  function finalizeMarkdownStyles(text) {
    let result = text;
    
    //  装飾の空打ちをクリーンアップ
    result = result.replace(/:::BOLD_START:::\s*:::BOLD_END:::/g, '');
    result = result.replace(/:::ITALIC_START:::\s*:::ITALIC_END:::/g, '');
    
    //  行ごとに処理し、重複を検出してクリーンアップする
    const lines = result.split('\n');
    const processedLines = lines.map(line => {
      let currentLine = line;
      if (currentLine.includes(':::NUM_START:::') && currentLine.includes(':::NUM_END:::')) {
        // 隔離マーカー（:::NUM_START:::〜:::NUM_END:::）を順番に検査
        currentLine = currentLine.replace(
          /([0-9０-９\.\-－．]+\s?)(:::(BOLD|ITALIC)_(START|STOP):::([0-9０-９\.\-－．]+))?:::NUM_START:::([0-9０-９\.\-－．]+):::NUM_END:::/g,
          (match, p1, p2, p3, p4, p5, p6) => {
            // p1は先頭の番号
            // p2は無視
            // p3,p4で識別子の前後
            // p5は:::xxx:::直後の部分
            // p6は:::NUM_START:::直後の部分
            const currentNormalized = normalizeStringForComparison(p1.trim());
            const backupNormalized = normalizeStringForComparison(p6);
            if (p5) {
              const middleNormalized = normalizeStringForComparison(p5.trim());
              if (currentNormalized === middleNormalized) {
                // 指定の前後で同じなら指定の位置を前にずらす
                if (middleNormalized === backupNormalized) {
                  //バックアップを消し、指定を前にずらす
                  return ':::'+p3+'_'+p4+':::'+p1;
                } else {
                  //バックアップを残し、指定を前にずらす
                  return ':::'+p3+'_'+p4+':::'+p1+p6;
                }
              } else {
                // 指定の前後で異なるなら指定の位置はそのまま
                if (middleNormalized === backupNormalized) {
                  //バックアップを消す
                  return p1+':::'+p3+'_'+p4+':::'+p5;
                } else {
                  //バックアップを残し、指定を前にずらす
                  return p1+':::'+p3+'_'+p4+':::'+p5+p6;
                }
              }
            } else {
              if (currentNormalized === backupNormalized) {
                return p1;
              } else {
                return p1+p6;
              }
            }
          });
      }

      // 行の先頭にある新しいリスト用連番（例: `- ３－２．`）をずれないように全角に変換する
      currentLine = currentLine.replace(
        /^(\s*)([0-9０-９\.\-－．]+)(\s)/,
        (match, p1, p2, p3) => {
          return p1+normalizeStringForComparison(p2)+p3;
        }
      );
      currentLine = sanitizeSignature(currentLine);
      return currentLine;
    });

    result = processedLines.join('\n');

    // プレースホルダーを一括して正規のMarkdown記号へ置換
    result = result.replace(/:::BOLD_START:::/g, '**');
    result = result.replace(/:::BOLD_END:::/g, '**');
    result = result.replace(/:::ITALIC_START:::/g, '*');
    result = result.replace(/:::ITALIC_END:::/g, '*');

    return result;
  }

  function convertToMarkdown(node, olIndex = null) {
    if (node.nodeType === Node.TEXT_NODE) {
      let val = decorateSignature(node.nodeValue);
      const numberRegex = /^([0-9０-９]+(?:[\.．\-－][0-9０-９]+)*[\.．\-－]?)/;
      const match = val.trimStart().match(numberRegex);
      if (match) {
        const detectedNumber = match[0];
        const escaped = detectedNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const reg = new RegExp(`^(\\s*)(${escaped})([\\s\\.\\-\\、\\。．]*)`);
        val = val.replace(reg, (m, p1, p2, p3) => {
          return `${p1}${p2}${p3}:::NUM_START:::${p2}:::NUM_END:::`;
        });
        return val;
      }
      return escapeBackticks(val);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node;
    const tagName = element.tagName.toLowerCase();
    if (shouldIgnoreElement(element)) {
      return '';
    }

    const rawText = element.innerText ? decorateSignature(element.innerText.trim()) : '';
    const numberRegex = /^([0-9０-９]+(?:[\.．\-－][0-9０-９]+)*[\.．\-－]?)/;
    const bulletRegex = /^[・●\-\*]/;

    if (tagName === 'div') {
      const role = element.getAttribute('role');
      const ariaLevel = element.getAttribute('aria-level');
      if ((role === 'heading' && (ariaLevel === '2' || ariaLevel === '3')) || element.hasAttribute('data-is-title')) {
        let childContent = '';
        element.childNodes.forEach(child => { childContent += convertToMarkdown(child); });
        return childContent.trim() ? `\n### ${childContent.trim()}\n\n` : '';
      }
      if (numberRegex.test(rawText) && (role === 'heading' || element.matches("[class*='title'], [class*='heading'], [style*='font-weight']"))) {
        let childContent = '';
        element.childNodes.forEach(child => { childContent += convertToMarkdown(child); });
        let cleanText = childContent.trim();
        const numMatch = rawText.match(numberRegex);
        if (numMatch) {
          const detectedNumber = numMatch[0];
          const zenkakuNumber = detectedNumber.replace(/[0-9\.\-]/g, (char) => {
            return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
          });
          if (cleanText.startsWith(detectedNumber)) {
            cleanText = cleanText.substring(detectedNumber.length).trim();
          }
          cleanText = `${zenkakuNumber} ${cleanText}`;
        }
        return `\n#### ${cleanText}\n\n`;
      }
    }

    const isPseudoListItem = (tagName === 'div' && (numberRegex.test(rawText) || bulletRegex.test(rawText)));

    if (tagName === 'li' || isPseudoListItem) {
      if (!rawText) return '';
      const totalLeftSpace = getLeftPixels(element);
      let indentLevel = Math.floor(totalLeftSpace / 20);
      indentLevel = Math.max(0, indentLevel);
      const indentStr = '  '.repeat(indentLevel);
      const numMatch = rawText.match(numberRegex);
      let detectedNumber = "";
      if (numMatch) {
        detectedNumber = numMatch[0];
      } else if (olIndex !== null) {
        detectedNumber = `${olIndex}.`;
      }

      if (detectedNumber) {
        let childContent = '';
        element.childNodes.forEach(child => { childContent += convertToMarkdown(child); });
        let cleanText = childContent.trim();
        if (cleanText.startsWith(detectedNumber)) {
          cleanText = cleanText.substring(detectedNumber.length).trim();
        }
        cleanText = cleanText.replace(/^[・●\-\.\s\_、。]+/, '');
        const zenkakuNumber = detectedNumber.replace(/[0-9\.\-]/g, (char) => {
          return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
        });
        const formattedChild = cleanText.replace(/\n/g, `\n${indentStr}    `);
        return `${indentStr}- ${zenkakuNumber} ${formattedChild}\n`;
      } else {
        let childContent = '';
        element.childNodes.forEach(child => { childContent += convertToMarkdown(child); });
        let cleanText = childContent.trim();
        cleanText = cleanText.replace(/^[・●\-\*]\s*/, '');
        const formattedChild = cleanText.replace(/\n/g, `\n${indentStr}    `);
        return `${indentStr}- ${formattedChild}\n`;
      }
    }

    let childContent = '';
    if (tagName === 'ol') {
      let liCount = 1;
      element.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
          childContent += convertToMarkdown(child, liCount++);
        } else {
          childContent += convertToMarkdown(child);
        }
      });
    } else {
      element.childNodes.forEach(child => { childContent += convertToMarkdown(child); });
    }

    switch (tagName) {
      case 'div': return childContent.trim() ? `\n${childContent.trim()}\n\n` : '';
      case 'hr': return '\n---\n\n';
      case 'code':
        if (element.parentNode && element.parentNode.tagName.toLowerCase() === 'pre') {
          return decorateSignature(element.textContent);
        }
        return `\`${decorateSignature(element.textContent)}\``;
      case 'pre':
        let langName = '';
        const parentContainer = element.closest('.pHpOfb');
        if (parentContainer) {
          const spanEl = parentContainer.querySelector('.vVRw1d');
          if (spanEl) {
            langName = treatLangnameFilename(decorateSignature(spanEl.innerText.trim()));
          }
        }
        return `\n\`\`\`${langName}\n${childContent.trim()}\n\`\`\`\n\n`;

      case 'h1': return childContent?.trim() ? `\n# ${childContent.trim()}\n\n` : '';
      case 'h2': return childContent?.trim() ? `\n## ${childContent.trim()}\n\n` : '';
      case 'h3': return childContent?.trim() ? `\n### ${childContent.trim()}\n\n` : '';
      case 'p': return childContent.trim() ? `${childContent.trim()}\n` : '';
      case 'br': return '\n';
      case 'strong':
      case 'b': return childContent ? `:::BOLD_START:::${childContent}:::BOLD_END:::` : '';
      case 'em':
      case 'i': return childContent ? `:::ITALIC_START:::${childContent}:::ITALIC_END:::` : '';
      case 'a': return `[${childContent}](${element.getAttribute('href') || ''})`;
      case 'ul':
      case 'ol': return `\n${childContent}\n`;
      default: return childContent;
    }
  }

  function convertToMarkdownGemini(node, olIndex = null) {
    if (node.nodeType === Node.TEXT_NODE) {
      let val = decorateSignature(node.nodeValue);
      const numberRegex = /^([0-9０-９]+(?:[\.．\-－][0-9０-９]+)*[\.．\-－]?)/;
      const match = val.trimStart().match(numberRegex);
      if (match) {
        const detectedNumber = match[0];
        const escaped = detectedNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const reg = new RegExp(`^(\\s*)(${escaped})([\\s\\.\\-\\、\\。．]*)`);
        val = val.replace(reg, (m, p1, p2, p3) => {
          return `${p1}${p2}${p3}:::NUM_START:::${p2}:::NUM_END:::`;
        });
        return val;
      }
      return escapeBackticks(val);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node;
    const tagName = element.tagName.toLowerCase();
    if (shouldIgnoreElementGemini(element)) {
      return '';
    }

    const rawText = element.innerText ? decorateSignature(element.innerText.trim()) : '';
    const numberRegex = /^([0-9０-９]+(?:[\.．\-－][0-9０-９]+)*[\.．\-－]?)/;
    const bulletRegex = /^[・●\-\*]/;

    if (tagName === 'div') {
      const role = element.getAttribute('role');
      const ariaLevel = element.getAttribute('aria-level');
      if ((role === 'heading' && (ariaLevel === '2' || ariaLevel === '3')) || element.hasAttribute('data-is-title')) {
        let childContent = '';
        element.childNodes.forEach(child => { childContent += convertToMarkdownGemini(child); });
        // return childContent.trim() ? `\n### ${childContent.trim()}\n\n` : '';
        return childContent.trim() ? `\n${childContent.trim()}\n\n` : '';
      }
      if (numberRegex.test(rawText) && (role === 'heading' || element.matches("[class*='title'], [class*='heading'], [style*='font-weight']"))) {
        let childContent = '';
        element.childNodes.forEach(child => { childContent += convertToMarkdownGemini(child); });
        let cleanText = childContent.trim();
        const numMatch = rawText.match(numberRegex);
        if (numMatch) {
          const detectedNumber = numMatch[0];
          const zenkakuNumber = detectedNumber.replace(/[0-9\.\-]/g, (char) => {
            return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
          });
          if (cleanText.startsWith(detectedNumber)) {
            cleanText = cleanText.substring(detectedNumber.length).trim();
          }
          cleanText = `${zenkakuNumber} ${cleanText}`;
        }
        return `\n#### ${cleanText}\n\n`;
      }
      if (element.classList.contains('file-preview-container')) {
        let list = '';
        element.querySelectorAll(".file-query-preview [data-test-id='filename-label']").forEach((item) => {
          list += '`'+item.innerText+'`';
        });
        return (list) ? "\nImport_file[${list.trim()}]\n" : '';
      }
    }

    const isPseudoListItem = (tagName === 'div' && (numberRegex.test(rawText) || bulletRegex.test(rawText)));

    if (tagName === 'li' || isPseudoListItem) {
      if (!rawText) return '';
      const totalLeftSpace = getLeftPixels(element);
      let indentLevel = Math.floor(totalLeftSpace / 20);
      indentLevel = Math.max(0, indentLevel);
      const indentStr = '  '.repeat(indentLevel);
      const numMatch = rawText.match(numberRegex);
      let detectedNumber = "";
      if (numMatch) {
        detectedNumber = numMatch[0];
      } else if (olIndex !== null) {
        detectedNumber = `${olIndex}.`;
      }

      if (detectedNumber) {
        let childContent = '';
        element.childNodes.forEach(child => { childContent += convertToMarkdownGemini(child); });
        let cleanText = childContent.trim();
        if (cleanText.startsWith(detectedNumber)) {
          cleanText = cleanText.substring(detectedNumber.length).trim();
        }
        cleanText = cleanText.replace(/^[・●\-\.\s\_、。]+/, '');
        const zenkakuNumber = detectedNumber.replace(/[0-9\.\-]/g, (char) => {
          return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
        });
        const formattedChild = cleanText.replace(/\n/g, `\n${indentStr}    `);
        return `${indentStr}- ${zenkakuNumber} ${formattedChild}\n`;
      } else {
        let childContent = '';
        element.childNodes.forEach(child => { childContent += convertToMarkdownGemini(child); });
        let cleanText = childContent.trim();
        cleanText = cleanText.replace(/^[・●\-\*]\s*/, '');
        const formattedChild = cleanText.replace(/\n/g, `\n${indentStr}    `);
        return `${indentStr}- ${formattedChild}\n`;
      }
    }

    let childContent = '';
    if (tagName === 'ol') {
      let liCount = 1;
      element.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
          childContent += convertToMarkdownGemini(child, liCount++);
        } else {
          childContent += convertToMarkdownGemini(child);
        }
      });
    } else {
      element.childNodes.forEach(child => { childContent += convertToMarkdownGemini(child); });
    }

    switch (tagName) {
      case 'div': return childContent.trim() ? `\n${childContent.trim()}\n\n` : '';
      case 'hr': return '\n---\n\n';
      case 'code':
        if (element.parentNode && element.parentNode.tagName.toLowerCase() === 'pre') {
          return decorateSignature(element.textContent);
        }
        return `\`${decorateSignature(element.textContent)}\``;
      case 'pre':
        let langName = '';
        const parentContainer = element.closest('div.formatted-code-block-internal-container');
        if (parentContainer) {
          const spanEl = parentContainer.querySelector('.code-block-decoration span');
          if (spanEl) {
            const innerstr = decorateSignature(spanEl.innerText.trim());
            if (innerstr) {
              langName = treatLangnameFilename(innerstr);
            }
          }
        }
        return `\n\`\`\`${langName}\n${childContent.trim()}\n\`\`\`\n\n`;

      case 'h1': return childContent?.trim() ? `\n# ${childContent.trim()}\n\n` : '';
      case 'h2': return childContent?.trim() ? `\n## ${childContent.trim()}\n\n` : '';
      case 'h3': return childContent?.trim() ? `\n### ${childContent.trim()}\n\n` : '';
      case 'p': return childContent.trim() ? `${childContent.trim()}\n` : '';
      case 'br': return '\n';
      case 'strong':
      case 'b': return childContent ? `:::BOLD_START:::${childContent}:::BOLD_END:::` : '';
      case 'em':
      case 'i': return childContent ? `:::ITALIC_START:::${childContent}:::ITALIC_END:::` : '';
      case 'a': return `[${childContent}](${element.getAttribute('href') || ''})`;
      case 'ul':
      case 'ol': return `\n${childContent}\n`;
      default: return childContent;
    }
  }

  function decorateSignature(arg) {
    let val = arg;
    if (val.match(/:::([a-zA-Z_:]+):::/)) {
      val = val.replace(
        /:::([a-zA-Z_:]+):::/g,
        ':::escaped:$1:escaped:::');
    }
    return val;
  }

  function sanitizeSignature(arg) {
    let val = arg;
    if (val.match(/:::escaped:([a-zA-Z_:]+):escaped:::/)) {
      val = val.replace(
        /:::escaped:([a-zA-Z_:]+):escaped:::/g,
        ':::$1:::');
    }
    return val;
  }

  function treatLangnameFilename(arg) {
    const extension = arg.match(/\.[^\.]+$/)
    let langName = '';
    if (extension) {
      // 拡張子があるので、拡張子から判断
      langName = extension;
    } else {
      // 拡張子が無いので言語名と判断
      switch (arg.toLowerCase()) {
        case 'javascript':
          langName = 'js'
          break;
        default:
          langName = arg.toLowerCase();
      }
    }
    return langName ? langName+':'+arg : arg;
  }
})();
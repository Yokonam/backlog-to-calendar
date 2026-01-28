'use strict';

// GROUPS_CONFIGはgroups-config.jsから読み込まれます

function appendHtml() {
  const groups = GROUPS_CONFIG;

  const content1 = document.querySelector('.ticket__key');
  const content2 = document.querySelector('#ui-state-disabledissue .header-icon-set');

  function createOption(options) {
    return `
      <div class='to-calender-select'>
        <select class='to-calender-select__inner'>
          ${options.map(option => `<option value="${option.value}">${option.text}</option>`).join('')}
        </select>
      </div>
    `;
  }

  const groupSelect = createOption(groups);
  const button = `<button class='to-calender-button'>登録</button>`;
  const summary = document.querySelector('.ticket__title').textContent;
  const key = document.querySelector('.ticket__key-number').textContent;
  const name = `${key} ${summary}`;

  content1.insertAdjacentHTML('afterend', `<div class='to-calender'>${groupSelect + button}</div>`);
  content2.insertAdjacentHTML('beforeend', `<div class='to-calender'>${groupSelect + button}</div>`);

  const toCalenders = document.querySelectorAll('.to-calender');

  toCalenders.forEach(element => {
    const button = element.querySelector('.to-calender-button');
    const select = element.querySelector('.to-calender-select__inner');
    button.addEventListener('click', () => {

      const selectedGroup = select.value;
      if(selectedGroup === '') return;

      chrome.storage.sync.get("tasks", function (data) {
        const tasks = data.tasks || [];
        const task = { name, group: selectedGroup, category: '案件作業' };

        tasks.push(task);
        chrome.storage.sync.set({ tasks });
      });
      alert('登録しました！');
    });
  });
}

// 監視する対象の要素を取得
const targetNode = document.getElementById('root');

// オプションで監視する変更のタイプを指定
const config = { childList: true, subtree: true, characterData: true };

// コールバック関数を定義
const callback = function(mutationsList, observer) {
  for (let mutation of mutationsList) {
    if (mutation.type === 'characterData' || mutation.type === 'childList') {
      console.log('ターゲットのタグが変更されました:', mutation);

      if (!observer.appendedHtml) {
        appendHtml();
        observer.appendedHtml = true;
      }

      observer.disconnect();
      break;
    }
  }
}

// オブザーバーインスタンスを作成し、監視を開始
const observer = new MutationObserver(callback);
observer.observe(targetNode, config);

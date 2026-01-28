'use strict';

// BACKLOG_CONFIGはconfig.jsから読み込まれます

// ===== デバッグ設定 =====
// trueにするとAPI呼び出しをモックデータで置き換えます
const MOCK_MODE = false;
// =======================

document.addEventListener("DOMContentLoaded", () => {
  const addButton = document.querySelector("#add");
  const taskInput = document.querySelector("input[type='text']");
  const taskList = document.querySelector("#task-list");

  const specifiedTasks = [
    { name: "", group: "その他", category: "雑務・その他" },
    { name: "", group: "その他", category: "社内関連" },
    { name: "", group: "その他", category: "勉強関連" },
    { name: "", group: "その他", category: "教育関連" },
    { name: "", group: "その他", category: "採用関連" },
  ];

  init();

  function init() {
    loadTasksFromStorage();
    addButton.addEventListener("click", handleAddTask);
    document.addEventListener("click", handleDocumentClick);
    setupTabNavigation();
  }

  function loadTasksFromStorage() {
    chrome.storage.sync.get("tasks", (data) => {
      const tasks = data.tasks || [];
      tasks.forEach(addTaskToList);
      specifiedTasks.forEach(addTaskToBottom);
    });
  }

  function handleAddTask() {
    const taskName = taskInput.value.trim();
    if (taskName === "") return;

    const task = createTaskObject(taskName);
    addTaskToList(task);
    saveTask(task);
    clearTaskInput();
  }

  function createTaskObject(name) {
    const group = getRadioValue('group');
    const category = getRadioValue('category');
    return { name, group, category };
  }

  function getRadioValue(name) {
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : "";
  }

  function addTaskToList(task) {
    const li = createTaskListItem(task);
    taskList.prepend(li);
  }

  function addTaskToBottom(task) {
    const li = createTaskListItem(task);
    taskList.appendChild(li);
  }

  function createTaskListItem(task) {
    const li = document.createElement("li");
    li.classList.add("task");
    const isSpecified = isSpecifiedTask(task);

    const taskText = isSpecified ? `${task.group} | ${task.category}` : `${task.group} | ${task.name}`;
    const nameText = isSpecified ? task.category : task.name;


    li.innerHTML = `
      <span class="tag" data-group="${task.group}">${escapeHTML(task.group)}</span>
      <span class="name">${nameText}</span>
      <div class="task__buttons">
        <a href="https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(taskText)}&details=${encodeURIComponent(task.group)}" data-type="add" target="_blank">追加</a>
        <button type="button" class="other">
          <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" style="width:16px;height:16px;opacity:1" viewBox="0 0 512 512"><circle cx="55.1" cy="256" r="55.1" style="fill:var(--_fill, #333)"/><circle cx="256" cy="256" r="55.1" style="fill:var(--_fill, #333)"/><circle cx="456.9" cy="256" r="55.1" style="fill:var(--_fill, #333)"/></svg>
        </button>
        <div class="popup" aria-hidden="true">
          ${!isSpecified ? '<button type="button" class="delete">削除</button>' : ''}
          <button type="button" class="copy">コピー</button>
          <button type="button" class="add-to-backlog">Backlogに追加</button>
        </div>
      </div>
    `;

    if (!isSpecified) {
      const deleteButton = li.querySelector(".delete");
      deleteButton.addEventListener("click", () => handleDeleteTask(li, task));
    }

    const copyButton = li.querySelector(".copy");
    copyButton.addEventListener("click", () => handleCopyTask(taskText));

    const addToBacklogButton = li.querySelector(".add-to-backlog");
    addToBacklogButton.addEventListener("click", () => handleAddToBacklog(task));

    const otherButton = li.querySelector(".other");
    otherButton.addEventListener("click", (event) => handleOtherButtonClick(event, li));

    return li;
  }

  function escapeHTML(string) {
    const div = document.createElement('div');
    div.textContent = string;
    return div.innerHTML;
  }

  function isSpecifiedTask(task) {
    return specifiedTasks.some(specifiedTask =>
      specifiedTask.name === task.name &&
      specifiedTask.group === task.group &&
      specifiedTask.category === task.category
    );
  }

  function handleOtherButtonClick(event, listItem) {
    event.stopPropagation();
    const popup = listItem.querySelector(".popup");
    const isHidden = popup.getAttribute("aria-hidden") === "true";
    closeAllPopups();
    popup.setAttribute("aria-hidden", !isHidden);
  }

  function handleDocumentClick(event) {
    if (!event.target.closest(".other")) {
      closeAllPopups();
    }
  }

  function closeAllPopups() {
    const allPopups = document.querySelectorAll(".popup");
    allPopups.forEach(popup => popup.setAttribute("aria-hidden", "true"));
  }

  function handleDeleteTask(listItem, task) {
    listItem.remove();
    removeTaskFromStorage(task);
  }

  function handleCopyTask(taskText) {
    navigator.clipboard.writeText(taskText)
      .then(() => alert('タスク名をコピーしました！'))
      .catch(err => console.error('テキストのコピーに失敗しました： ', err));
  }

  function handleAddToBacklog(task) {
    const taskText = isSpecifiedTask(task) ? `${task.category}` : `${task.name}`;
    
    // taskTextから先頭の課題キー部分を抽出
    const issueKeyMatch = taskText.match(/^[A-Z_]+-\d+/);
    const customFieldValue = issueKeyMatch ? issueKeyMatch[0] : task.group;
    
    // 開始日を今日に設定
    const startDate = new Date();
    const startDateStr = startDate.toISOString().split('T')[0];  // YYYY-MM-DD形式

    // 期限日を1週間後に設定
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split('T')[0];  // YYYY-MM-DD形式

    // 確認モーダルを表示
    showBacklogConfirmModal({
      taskText,
      customFieldValue,
      startDateStr,
      dueDateStr,
      estimatedHours: 1  // デフォルト1時間
    });
  }

  function showBacklogConfirmModal(data) {
    const modal = document.getElementById('backlog-confirm-modal');
    const summaryInput = document.getElementById('modal-summary');
    const startDateInput = document.getElementById('modal-start-date');
    const dueDateInput = document.getElementById('modal-due-date');
    const estimatedHoursInput = document.getElementById('modal-estimated-hours');
    const timeUnitSelect = document.getElementById('modal-time-unit');
    const convertedHoursSpan = document.getElementById('converted-hours');
    const confirmButton = document.getElementById('modal-confirm');
    const cancelButton = document.getElementById('modal-cancel');

    // モーダルに初期値を設定
    summaryInput.value = data.taskText;
    startDateInput.value = data.startDateStr;
    dueDateInput.value = data.dueDateStr;
    estimatedHoursInput.value = data.estimatedHours;
    timeUnitSelect.value = 'hours';
    convertedHoursSpan.textContent = '';

    // 単位変更または値変更時の換算表示
    const updateConvertedHours = () => {
      const value = parseFloat(estimatedHoursInput.value);
      const unit = timeUnitSelect.value;
      
      if (value && unit === 'days') {
        const hours = value * 8;
        convertedHoursSpan.textContent = `(${hours}時間)`;
      } else {
        convertedHoursSpan.textContent = '';
      }
    };

    estimatedHoursInput.addEventListener('input', updateConvertedHours);
    timeUnitSelect.addEventListener('change', updateConvertedHours);

    // モーダルを表示
    modal.style.display = 'flex';
    closeAllPopups();

    // 確認ボタンのクリックイベント
    confirmButton.onclick = async () => {
      modal.style.display = 'none';
      
      // 予定時間を計算（人日の場合は8倍）
      let estimatedHours = parseFloat(estimatedHoursInput.value) || null;
      if (estimatedHours && timeUnitSelect.value === 'days') {
        estimatedHours = estimatedHours * 8;
      }
      
      await submitToBacklog({
        taskText: summaryInput.value,
        customFieldValue: data.customFieldValue,
        startDate: startDateInput.value,
        dueDate: dueDateInput.value,
        estimatedHours: estimatedHours
      });
    };

    // キャンセルボタンのクリックイベント
    cancelButton.onclick = () => {
      modal.style.display = 'none';
    };
  }

  async function submitToBacklog(data) {
    try {
      if (MOCK_MODE) {
        // モックデータで成功通知を表示
        const mockIssueKey = 'TEST-123';
        const mockIssueUrl = `https://example.backlog.jp/view/${mockIssueKey}`;
        
        console.log('【モックモード】課題追加をシミュレート:', {
          issueKey: mockIssueKey,
          summary: data.taskText,
          startDate: data.startDate,
          dueDate: data.dueDate,
          estimatedHours: data.estimatedHours
        });
        
        // 通知を表示
        showBacklogNotification(mockIssueKey, mockIssueUrl);
        return;
      }
      
      const url = `https://${BACKLOG_CONFIG.spaceKey}.backlog.jp/api/v2/issues?apiKey=${BACKLOG_CONFIG.apiKey}`;
      const params = new URLSearchParams({
        projectId: BACKLOG_CONFIG.projectId,
        summary: data.taskText,
        description: data.taskText,
        issueTypeId: BACKLOG_CONFIG.issueTypeId,
        priorityId: BACKLOG_CONFIG.priorityId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        assigneeId: '308322',
        customField_210589: data.customFieldValue,  // 案件ID
        customField_210590: data.startDate,  // 工数集計開始（開始日と同じ）
        customField_210591: data.dueDate,  // 工数集計終了（期限日と同じ）
      });

      // 予定時間が入力されている場合のみ追加
      if (data.estimatedHours) {
        params.append('estimatedHours', data.estimatedHours);
        // 見積金額 = 5000 × 予定時間（時間）
        const estimatedAmount = data.estimatedHours * 5000;
        params.append('customField_210574', estimatedAmount);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || 'Backlogへの追加に失敗しました');
      }

      const result = await response.json();
      const issueUrl = `https://${BACKLOG_CONFIG.spaceKey}.backlog.jp/view/${result.issueKey}`;
      
      // 通知を表示
      showBacklogNotification(result.issueKey, issueUrl);
      
      // コンソールにもリンクを出力
      console.log('追加された課題:', issueUrl);
    } catch (error) {
      console.error('Backlogへの追加エラー:', error);
      alert(`エラー: ${error.message}`);
    }
  }

  function saveTask(task) {
    chrome.storage.sync.get("tasks", (data) => {
      const tasks = data.tasks || [];
      tasks.push(task);
      chrome.storage.sync.set({ tasks });
    });
  }

  function removeTaskFromStorage(taskToRemove) {
    chrome.storage.sync.get("tasks", (data) => {
      const tasks = data.tasks || [];
      const updatedTasks = tasks.filter(task =>
        task.name !== taskToRemove.name ||
        task.group !== taskToRemove.group ||
        task.category !== taskToRemove.category
      );
      chrome.storage.sync.set({ tasks: updatedTasks });
    });
  }

  function setupTabNavigation() {
    const tabLinks = document.querySelectorAll(".tab-link");
    const sections = document.querySelectorAll(".content");

    tabLinks.forEach(link => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        updateTabs(link, tabLinks, sections);
      });
    });

    sections.forEach(section => section.hidden = true);
    document.getElementById("task-list-content").hidden = false;
  }

  function updateTabs(selectedLink, allLinks, allSections) {
    allLinks.forEach(tab => {
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("tabindex", "-1");
    });

    selectedLink.setAttribute("aria-selected", "true");
    selectedLink.setAttribute("tabindex", "0");

    allSections.forEach(section => section.hidden = true);
    const targetId = selectedLink.getAttribute("data-target");
    document.getElementById(targetId).hidden = false;
  }

  function clearTaskInput() {
    taskInput.value = "";
  }

  function showBacklogNotification(issueKey, issueUrl) {
    const notification = document.getElementById('success-notification');
    const messageSpan = notification.querySelector('.notification-message');
    const closeButton = notification.querySelector('.notification-close');
    
    // メッセージを設定
    messageSpan.innerHTML = `Backlogに課題を追加しました！<br>課題キー: <a href="${issueUrl}" target="_blank" style="color: white; text-decoration: underline;">${issueKey}</a>`;
    
    // 通知を表示
    notification.style.display = 'block';
    
    // 閉じるボタンのイベント
    closeButton.onclick = () => {
      notification.style.display = 'none';
    };
    
    // 5秒後に自動的に非表示
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
  }
});
'use strict';

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
        </div>
      </div>
    `;

    if (!isSpecified) {
      const deleteButton = li.querySelector(".delete");
      deleteButton.addEventListener("click", () => handleDeleteTask(li, task));
    }

    const copyButton = li.querySelector(".copy");
    copyButton.addEventListener("click", () => handleCopyTask(taskText));

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
});

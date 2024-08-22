'use strict';

document.addEventListener("DOMContentLoaded", function () {
  const addButton = document.querySelector("#add");
  const taskInput = document.querySelector("input[type='text']");
  const taskList = document.querySelector("#task-list");

  // 複数の指定されたタスク
  const specifiedTasks = [
    { name: "", group: "その他", category: "庶務作業" },
    { name: "", group: "その他", category: "MTG・面談" },
    { name: "", group: "その他", category: "相談・サポート" },
    { name: "", group: "その他", category: "学習、情報収集、環境整備" },
  ];

  init();

  function init() {
    loadTasksFromStorage();
    addButton.addEventListener("click", handleAddTask);
    document.addEventListener("click", handleDocumentClick); // Listen for clicks on the document
    setupTabNavigation();
  }

  function loadTasksFromStorage() {
    chrome.storage.sync.get("tasks", function (data) {
      const tasks = data.tasks || [];
      tasks.forEach(addTaskToList);

      // 指定されたタスクを常にリストの一番下に追加
      specifiedTasks.forEach(task => addTaskToBottom(task));
    });
  }

  function handleAddTask() {
    const taskName = taskInput.value.trim();
    const task = createTaskObject(taskName);
    addTaskToList(task);
    saveTask(task);
    clearTaskInput();
  }

  function createTaskObject(name) {
    const group = document.querySelector('input[name="group"]:checked').value;
    const category = document.querySelector('input[name="category"]:checked').value;
    return { name, group, category };
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

    const taskText = `${task.group} | ${task.category} | ${task.name}`;
    li.innerHTML = `
      <span class="tag" data-group="${task.group}">${task.group}</span>
      <span class="name">${task.category} | ${task.name}</span>
      <div class="task__buttons">
        <a href="https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(taskText)}&details=${encodeURIComponent(task.group)}" data-type="add" target="_blank">追加</a>
        <button type="button" class="other">
          <img src="dod.svg" alt="その他" width="16" height="16" />
        </button>
        <div class="popup" aria-hidden="true">
          ${!isSpecifiedTask(task) ? '<button type="button" class="delete">削除</button>' : ''}
          <button type="button" class="copy">コピー</button>
        </div>
      </div>
    `;

    if (!isSpecifiedTask(task)) {
      const deleteButton = li.querySelector(".delete");
      deleteButton.addEventListener("click", () => handleDeleteTask(li, task));
    }

    const copyButton = li.querySelector(".copy");
    copyButton.addEventListener("click", () => handleCopyTask(taskText));

    const otherButton = li.querySelector(".other");
    otherButton.addEventListener("click", (event) => handleOtherButtonClick(event, li));

    return li;
  }

  function isSpecifiedTask(task) {
    return specifiedTasks.some(specifiedTask =>
      specifiedTask.name === task.name &&
      specifiedTask.group === task.group &&
      specifiedTask.category === task.category
    );
  }

  function handleOtherButtonClick(event, listItem) {
    event.stopPropagation(); // Prevent the document click handler from closing the popup immediately
    const popup = listItem.querySelector(".popup");
    const isHidden = popup.getAttribute("aria-hidden") === "true";
    closeAllPopups(); // Close any other open popups
    popup.setAttribute("aria-hidden", !isHidden);
  }

  function handleDocumentClick(event) {
    const otherButton = event.target.closest(".other");
    if (!otherButton) {
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
    navigator.clipboard.writeText(taskText).then(() => {
      alert('Task text copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  function saveTask(task) {
    chrome.storage.sync.get("tasks", function (data) {
      const tasks = data.tasks || [];
      tasks.push(task);
      chrome.storage.sync.set({ tasks });
    });
  }

  function removeTaskFromStorage(taskToRemove) {
    chrome.storage.sync.get("tasks", function (data) {
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
      link.addEventListener("click", function (event) {
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

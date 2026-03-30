document.addEventListener('DOMContentLoaded', () => {
    // ---- 1. Data Store Initialization & Migration ----
    let rawStore = localStorage.getItem('ivyLeeData');
    let store = rawStore ? JSON.parse(rawStore) : null;
    let currentCategory = localStorage.getItem('ivyLeeCategory') || 'private';
    
    // Theme logic
    let currentTheme = localStorage.getItem('ivyLeeTheme') || 'sakura';
    document.body.setAttribute('data-theme', currentTheme);
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) themeSelector.value = currentTheme;

    themeSelector.addEventListener('change', (e) => {
        currentTheme = e.target.value;
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('ivyLeeTheme', currentTheme);
    });

    // Tools
    function generateId() { return Math.random().toString(36).substr(2, 9); }
    function saveStore() { localStorage.setItem('ivyLeeData', JSON.stringify(store)); }
    function formatDateYMD(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const today = new Date();
    const todayYMD = formatDateYMD(today);

    // Initial Migration logic
    if (!store || (!store.work && !store.private)) {
        const oldTasksByDate = store?.tasksByDate || {};
        const oldHistory = store?.history || [];
        store = {
            work: { tasksByDate: oldTasksByDate, history: oldHistory },
            private: { tasksByDate: {}, history: [] }
        };
        saveStore();
    }
    
    // Further check for extremely old "ivyLeeTasks" object
    const oldTasks = JSON.parse(localStorage.getItem('ivyLeeTasks'));
    if (oldTasks && Object.keys(store.work.tasksByDate).length === 0) {
        store.work.tasksByDate[todayYMD] = oldTasks.map(t => ({ 
            id: generateId(), text: t.text, completed: t.completed 
        }));
        localStorage.removeItem('ivyLeeTasks');
        saveStore();
    }

    // ---- 2. Category Toggle Logic ----
    function switchCategory(category, isInitial = false) {
        currentCategory = category;
        localStorage.setItem('ivyLeeCategory', category);
        
        // update UI buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${category}`).classList.add('active');
        
        if (isInitial) {
            renderWeek();
        } else {
            // re-render week container with slight animation
            const weekContainer = document.getElementById('week-container');
            weekContainer.style.opacity = '0';
            setTimeout(() => {
                renderWeek();
                weekContainer.style.opacity = '1';
            }, 200);
        }
    }
    
    // Event listener for Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cat = e.currentTarget.getAttribute('data-category');
            if (currentCategory !== cat) switchCategory(cat);
        });
    });

    // ---- 3. Render UI (Weekly View) ----
    const weekContainer = document.getElementById('week-container');
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    
    function renderWeek() {
        weekContainer.innerHTML = '';
        const catData = store[currentCategory];

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const dateStr = formatDateYMD(d);
            const isToday = i === 0;
            const title = isToday ? `今日 ${d.getMonth()+1}/${d.getDate()}(${dayNames[d.getDay()]})` 
                          : `${d.getMonth()+1}/${d.getDate()}(${dayNames[d.getDay()]})`;

            const tasks = catData.tasksByDate[dateStr] || [];
            
            const card = document.createElement('div');
            card.className = `day-card ${isToday ? 'today-card' : ''}`;
            
            const disabledAttr = tasks.length >= 6 ? 'disabled' : '';
            const placeholder = tasks.length >= 6 ? '最大6つまで設定可能' : '新しいタスクを追加...';
            
            let html = `
                <div class="card-header">
                    <h2>${title}</h2>
                </div>
                <div class="task-input-section">
                    <input type="text" id="input-${dateStr}" placeholder="${placeholder}" ${disabledAttr}>
                    <button class="add-task-btn" data-date="${dateStr}" ${disabledAttr}>追加</button>
                </div>
                <ul class="task-list" id="list-${dateStr}">
            `;
            
            for (let j = 0; j < 6; j++) {
                const task = tasks[j];
                if (task) {
                    html += `
                        <li class="task-item ${task.completed ? 'completed' : ''}">
                            <div class="rank">${j + 1}</div>
                            <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''} data-date="${dateStr}" data-id="${task.id}">
                            <span class="task-text">${escapeHTML(task.text)}</span>
                            <button class="delete-btn" aria-label="削除" data-date="${dateStr}" data-id="${task.id}">×</button>
                        </li>
                    `;
                } else {
                    html += `
                        <li class="task-item empty">
                            <div class="rank empty-rank">${j + 1}</div>
                            <span class="task-text empty-text">未設定</span>
                        </li>
                    `;
                }
            }
            html += `</ul>`;
            
            const allCompleted = tasks.length > 0 && tasks.every(t => t.completed);
            
            if (tasks.some(t => !t.completed) || tasks.length === 0) {
                const nextD = new Date(d);
                nextD.setDate(nextD.getDate() + 1);
                const nextDateStr = formatDateYMD(nextD);
                
                html += `
                <div class="actions-section">
                    <button class="carry-over-btn" data-date="${dateStr}" data-next="${nextDateStr}">
                        未完了を翌日へ繰り越す
                    </button>
                </div>`;
            } else if (allCompleted) {
                html += `
                <div class="actions-section">
                    <div class="all-done-msg">🎊 すべて完了しました！</div>
                </div>`;
            }

            card.innerHTML = html;
            weekContainer.appendChild(card);
        }
    }

    // ---- 4. Render History Modal ----
    function renderHistory() {
        // Label indicating which history is being shown
        const label = document.getElementById('history-category-label');
        label.textContent = currentCategory === 'work' ? '(💼 仕事)' : '(🏠 プライベート)';
        
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        const catHistory = store[currentCategory].history;
        
        if (!catHistory || catHistory.length === 0) {
            list.innerHTML = '<li class="empty-msg">完了したタスクの履歴はありません。</li>';
            return;
        }

        const sortedHistory = [...catHistory].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        let currentDateGroup = null;
        
        sortedHistory.forEach(item => {
            const itemDate = new Date(item.completedAt);
            const dateStr = formatDateYMD(itemDate);
            
            if (dateStr !== currentDateGroup) {
                const header = document.createElement('h3');
                header.className = 'history-date-header';
                header.textContent = `${itemDate.getFullYear()}年${itemDate.getMonth() + 1}月${itemDate.getDate()}日`;
                list.appendChild(header);
                currentDateGroup = dateStr;
            }
            
            const li = document.createElement('li');
            li.className = 'history-item';
            const timeStr = `${String(itemDate.getHours()).padStart(2,'0')}:${String(itemDate.getMinutes()).padStart(2,'0')}`;
            
            li.innerHTML = `
                <span class="history-time">${timeStr}</span>
                <span class="history-text">${escapeHTML(item.text)}</span>
            `;
            list.appendChild(li);
        });
    }

    // ---- 5. Global Event Listeners ----
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-task-btn')) {
            addTask(e.target.getAttribute('data-date'));
        }
        if (e.target.classList.contains('delete-btn')) {
            deleteTask(e.target.getAttribute('data-date'), e.target.getAttribute('data-id'));
        }
        if (e.target.classList.contains('carry-over-btn')) {
            carryOverTasks(e.target.getAttribute('data-date'), e.target.getAttribute('data-next'));
        }
        
        if (e.target.id === 'show-history-btn') {
            renderHistory();
            document.getElementById('history-modal').classList.remove('hidden');
        }
        
        if (e.target.hasAttribute('data-close')) {
            document.getElementById(e.target.getAttribute('data-close')).classList.add('hidden');
        }

        if (e.target.id === 'clear-history-btn') {
            if (confirm(`${currentCategory === 'work' ? '仕事' : 'プライベート'}の履歴データを完全に消去してもよろしいですか？`)) {
                store[currentCategory].history = [];
                saveStore();
                renderHistory();
            }
        }
    });

    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id.startsWith('input-')) {
            addTask(e.target.id.replace('input-', ''));
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('checkbox')) {
            toggleTask(e.target.getAttribute('data-date'), e.target.getAttribute('data-id'), e.target.checked);
        }
    });

    // ---- 6. State Modifications ----
    function addTask(dateStr) {
        const input = document.getElementById(`input-${dateStr}`);
        const text = input.value.trim();
        const catData = store[currentCategory];
        
        if (!catData.tasksByDate[dateStr]) catData.tasksByDate[dateStr] = [];
        
        if (text && catData.tasksByDate[dateStr].length < 6) {
            catData.tasksByDate[dateStr].push({ id: generateId(), text, completed: false });
            input.value = '';
            saveStore();
            renderWeek();
            setTimeout(() => {
                const updatedInput = document.getElementById(`input-${dateStr}`);
                if (updatedInput && !updatedInput.disabled) updatedInput.focus();
            }, 0);
        }
    }

    function toggleTask(dateStr, id, isCompleted) {
        const catData = store[currentCategory];
        const task = catData.tasksByDate[dateStr].find(t => t.id === id);
        
        if (task) {
            task.completed = isCompleted;
            if (!catData.history) catData.history = [];
            
            if (isCompleted) {
                catData.history.push({ id: task.id, text: task.text, completedAt: new Date().toISOString() });
            } else {
                catData.history = catData.history.filter(h => h.id !== task.id);
            }
            saveStore();
            renderWeek();
        }
    }

    function deleteTask(dateStr, id) {
        const catData = store[currentCategory];
        catData.tasksByDate[dateStr] = catData.tasksByDate[dateStr].filter(t => t.id !== id);
        saveStore();
        renderWeek();
    }

    function carryOverTasks(currentDate, nextDate) {
        const catData = store[currentCategory];
        const currentTasks = catData.tasksByDate[currentDate] || [];
        const incompleteTasks = currentTasks.filter(t => !t.completed);
        const completedTasks = currentTasks.filter(t => t.completed);
        
        if (incompleteTasks.length === 0) return;
        
        if (!catData.tasksByDate[nextDate]) catData.tasksByDate[nextDate] = [];
        
        let carriedCount = 0;
        incompleteTasks.forEach(task => {
            if (catData.tasksByDate[nextDate].length < 6) {
                catData.tasksByDate[nextDate].push(task);
                carriedCount++;
            }
        });
        
        if (carriedCount === 0) {
            alert('翌日のタスクリストがすでに6つ埋まっているため、一部のタスクを繰り越しできません。');
            return;
        }

        const remainingIncomplete = incompleteTasks.slice(carriedCount);
        catData.tasksByDate[currentDate] = [...completedTasks, ...remainingIncomplete];
        
        saveStore();
        renderWeek();
        
        // Flash animation
        document.body.style.transition = "opacity 0.2s";
        document.body.style.opacity = "0.7";
        setTimeout(() => document.body.style.opacity = "1", 200);
    }

    const escapeHTML = (str) => {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    // INIT
    switchCategory(currentCategory, true);
});

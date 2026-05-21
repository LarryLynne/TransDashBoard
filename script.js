// ВСТАВЬ СЮДА СВОЙ URL из Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbwhvq8vLL6s2O2uRC1oGMIho1tkko9IgkaINgsd7D9xe55YpC0uBigKQxZbJtpdHST8/exec';

let globalData = {}; 
let currentTab = 'Регіональна'; 
let currentDate = null; 
let chartCost = null;
let chartUtil = null;
let chartLoad = null;

const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false 
        }
    },
    scales: {
        x: {
            ticks: { color: '#94a3b8' },
            grid: { color: '#1e293b' }
        },
        y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8' },
            grid: { color: '#1e293b' }
        }
    }
};

window.onload = function() {
    loadAllData(); 
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            currentTab = e.target.dataset.target;
            updateViewForCurrentTab();
        });
    });
};

async function loadAllData() {
    document.getElementById('status').innerText = 'Завантаження всіх даних бази...';
    
    try {
        const response = await fetch(API_URL);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        globalData = result.data;
        document.getElementById('status').innerText = 'Дані успішно завантажені!';
        setTimeout(() => document.getElementById('status').innerText = '', 2000); 
        
        updateViewForCurrentTab();
    } catch (error) {
        document.getElementById('status').innerText = `Помилка: ${error.message}`;
        console.error(error);
    }
}

function updateViewForCurrentTab() {
    const tabData = globalData[currentTab] || [];
    
    if (tabData.length === 0) {
        document.getElementById('dateFilter').innerHTML = '<option>Немає даних</option>';
        if (chartCost) chartCost.destroy();
        if (chartUtil) chartUtil.destroy();
        if (chartLoad) chartLoad.destroy();
        currentDate = null; 
        return;
    }

    const uniqueDates = [...new Set(tabData.map(item => item.date))];
    
    if (!currentDate || !uniqueDates.includes(currentDate)) {
        currentDate = uniqueDates[0];
    }

    renderDateFilter(uniqueDates, currentDate);
    renderChartsForDate(currentDate);
}

function formatDisplayDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; 
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

// Логика под новый выпадающий список
function renderDateFilter(dates, activeDate) {
    const select = document.getElementById('dateFilter');
    select.innerHTML = '';
    
    dates.forEach((date) => {
        let option = document.createElement('option');
        option.value = date; // Оригинальная дата для фильтрации в коде
        option.innerText = formatDisplayDate(date); // Красивый формат для интерфейса
        
        if (date === activeDate) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    // Навешиваем событие изменения выбора в селекте
    select.onchange = function(e) {
        currentDate = e.target.value;
        renderChartsForDate(currentDate);
    };
}

function renderChartsForDate(targetDate) {
    const tabData = globalData[currentTab] || [];
    const filtered = tabData.filter(item => item.date === targetDate);
    
    // --- 1. График стоимости ---
    const sortedByCost = [...filtered].sort((a, b) => (Number(b.cost) || 0) - (Number(a.cost) || 0));
    const labelsCost = sortedByCost.map(i => i.type);
    const costs = sortedByCost.map(i => i.cost);

    const ctxCost = document.getElementById('costChart').getContext('2d');
    if (chartCost) chartCost.destroy();
    chartCost = new Chart(ctxCost, {
        type: 'bar',
        data: {
            labels: labelsCost,
            datasets: [{ data: costs, backgroundColor: 'rgba(0, 188, 255, 0.6)', borderColor: '#00bcff', borderWidth: 1 }]
        },
        options: darkChartOptions
    });

    // --- Проверка наличия утилизации ---
    const hasUtilization = filtered.some(i => i.utilization !== undefined && i.utilization !== null && i.utilization !== '');
    const utilWrapper = document.getElementById('utilizationWrapper');

    // --- 2. График утилизации ---
    if (hasUtilization) {
        utilWrapper.style.display = 'flex'; 
        
        const sortedByUtil = [...filtered].sort((a, b) => (Number(b.utilization) || 0) - (Number(a.utilization) || 0));
        const labelsUtil = sortedByUtil.map(i => i.type);
        const utils = sortedByUtil.map(i => i.utilization);

        const ctxUtil = document.getElementById('utilizationChart').getContext('2d');
        if (chartUtil) chartUtil.destroy();

        chartUtil = new Chart(ctxUtil, {
            type: 'bar',
            data: {
                labels: labelsUtil,
                datasets: [{ data: utils, backgroundColor: 'rgba(242, 100, 25, 0.6)', borderColor: '#f26419', borderWidth: 1 }]
            },
            options: darkChartOptions 
        });
    } else {
        utilWrapper.style.display = 'none'; 
        if (chartUtil) chartUtil.destroy();
    }

    // --- 3. График загрузки ---
    const sortedByLoad = [...filtered].sort((a, b) => (Number(b.load) || 0) - (Number(a.load) || 0));
    const labelsLoad = sortedByLoad.map(i => i.type);
    const loads = sortedByLoad.map(i => i.load);

    const ctxLoad = document.getElementById('loadChart').getContext('2d');
    if (chartLoad) chartLoad.destroy();

    chartLoad = new Chart(ctxLoad, {
        type: 'bar',
        data: {
            labels: labelsLoad,
            datasets: [{ data: loads, backgroundColor: 'rgba(0, 204, 153, 0.6)', borderColor: '#00cc99', borderWidth: 1 }]
        },
        options: darkChartOptions 
    });
}
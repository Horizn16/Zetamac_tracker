// Popup functionality for Zetamac Tracker
class ZetamacPopup {
  constructor() {
    this.scores = [];
    this.currentView = 'chart';
    this.theme = localStorage.getItem('zetamac-theme') || 'dark';
    this.init();
  }

  async init() {
    this.setTheme(this.theme);
    await this.loadScores();
    this.setupEventListeners();
    this.updateStats();
    this.renderChart();
  }

  setTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zetamac-theme', theme);
    
    const toggle = document.getElementById('themeToggle');
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    
    // Re-render chart with new theme colors
    if (this.currentView === 'chart') {
      this.renderChart();
    }
  }

  toggleTheme() {
    const newTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  async loadScores() {
    try {
      const result = await chrome.storage.local.get(['scores']);
      this.scores = result.scores || [];
      console.log('Loaded scores:', this.scores);
    } catch (error) {
      console.error('Error loading scores:', error);
    }
  }

  setupEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    document.getElementById('showChart').addEventListener('click', () => {
      this.switchView('chart');
    });

    document.getElementById('showHistory').addEventListener('click', () => {
      this.switchView('history');
    });

    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData();
    });
  }

  switchView(view) {
    this.currentView = view;
    
    // Update button states
    document.querySelectorAll('.controls button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (view === 'chart') {
      document.getElementById('showChart').classList.add('active');
      document.getElementById('chartView').style.display = 'block';
      document.getElementById('historyView').style.display = 'none';
      this.renderChart();
    } else if (view === 'history') {
      document.getElementById('showHistory').classList.add('active');
      document.getElementById('chartView').style.display = 'none';
      document.getElementById('historyView').style.display = 'block';
      this.renderHistory();
    }
  }

  updateStats() {
    const totalGames = this.scores.length;
    const bestScore = totalGames > 0 ? Math.max(...this.scores.map(s => s.score)) : 0;
    const avgScore = totalGames > 0 ? Math.round(this.scores.reduce((sum, s) => sum + s.score, 0) / totalGames) : 0;
    
    // Today's games - use system local time
    const now = new Date();
    const todayGames = this.scores.filter(s => {
      const d = new Date(s.timestamp);
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate();
    }).length;

    // Format numbers with separators for better readability
    document.getElementById('totalGames').textContent = totalGames.toLocaleString();
    document.getElementById('bestScore').textContent = bestScore.toLocaleString();
    document.getElementById('avgScore').textContent = avgScore.toLocaleString();
    document.getElementById('todayGames').textContent = todayGames.toLocaleString();
  }

  renderChart() {
    const canvas = document.getElementById('scoreChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get theme colors
    const isDark = this.theme === 'dark';
    const gridColor = isDark ? '#404040' : '#c1d9f0';
    const lineColor = isDark ? '#00ff88' : '#4a90e2';
    const textColor = isDark ? '#e8e8e8' : '#1e3a5f';
    
    if (this.scores.length === 0) {
      ctx.fillStyle = textColor;
      ctx.font = '12px "SF Mono", "Monaco", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO DATA AVAILABLE', width / 2, height / 2);
      return;
    }

    // Get recent scores (last 20 games)
    const recentScores = this.scores.slice(-20);
    const maxScore = Math.max(...recentScores.map(s => s.score));
    const minScore = Math.min(...recentScores.map(s => s.score));
    const scoreRange = maxScore - minScore || 1;

    // Chart dimensions
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Draw background grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw score line
    if (recentScores.length > 1) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      recentScores.forEach((score, index) => {
        const x = padding + (chartWidth / Math.max(recentScores.length - 1, 1)) * index;
        const y = padding + chartHeight - ((score.score - minScore) / scoreRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();

      // Draw points
      ctx.fillStyle = lineColor;
      recentScores.forEach((score, index) => {
        const x = padding + (chartWidth / Math.max(recentScores.length - 1, 1)) * index;
        const y = padding + chartHeight - ((score.score - minScore) / scoreRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw labels
    ctx.fillStyle = textColor;
    ctx.font = '9px "SF Mono", "Monaco", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`MIN: ${minScore}`, padding, height - 5);
    ctx.textAlign = 'right';
    ctx.fillText(`MAX: ${maxScore}`, width - padding, height - 5);
    ctx.textAlign = 'center';
    ctx.fillText(`LAST ${recentScores.length} GAMES`, width / 2, 12);
  }

  renderHistory() {
    const historyList = document.getElementById('historyList');
    
    if (this.scores.length === 0) {
      historyList.innerHTML = '<div class="no-data">NO GAMES RECORDED</div>';
      return;
    }

    // Sort scores by timestamp (newest first)
    const sortedScores = [...this.scores].sort((a, b) => b.timestamp - a.timestamp);
    
    historyList.innerHTML = sortedScores.slice(0, 10).map((score, index) => {
      const date = new Date(score.timestamp);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${day}/${month}/${year}`;
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Calculate performance indicator
      let indicator = '';
      if (index < sortedScores.length - 1) {
        const prevScore = sortedScores[index + 1].score;
        if (score.score > prevScore) {
          indicator = '<span class="performance-indicator performance-up"></span>';
        } else if (score.score < prevScore) {
          indicator = '<span class="performance-indicator performance-down"></span>';
        } else {
          indicator = '<span class="performance-indicator performance-neutral"></span>';
        }
      }
      
      return `
        <div class="history-item">
          <div class="history-score">${score.score.toLocaleString()}${indicator}</div>
          <div class="history-date">${dateStr} • ${timeStr}</div>
        </div>
      `;
    }).join('');
  }

  exportData() {
    if (this.scores.length === 0) {
      alert('NO DATA TO EXPORT');
      return;
    }

    const csvContent = 'Date,Time,Score,Duration,Timestamp\n' + 
      this.scores.map(score => {
        const date = new Date(score.timestamp);
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0];
        const duration = score.duration ? Math.round(score.duration / 1000) : 'N/A';
        return `${dateStr},${timeStr},${score.score},${duration}s,${score.timestamp}`;
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zetamac-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ZetamacPopup();
});

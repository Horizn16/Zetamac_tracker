// Content script to monitor Zetamac game and capture scores
class ZetamacTracker {
  constructor() {
    this.isGameActive = false;
    this.lastScore = 0;
    this.gameStartTime = null;
    this.init();
  }

  init() {
    console.log('Zetamac Tracker initialized');
    this.observeScoreChanges();
    this.observeGameState();
  }

  observeScoreChanges() {
    // Look for score element
    const scoreObserver = new MutationObserver((mutations) => {
      this.checkForGameCompletion();
    });

    // Start observing the document
    scoreObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  observeGameState() {
    // Check for timer and game state changes
    setInterval(() => {
      this.checkGameState();
    }, 1000);
  }

  checkGameState() {
    // Look for timer element
    const timerElement = this.findElementByText('Seconds left:');
    if (timerElement) {
      const timerText = timerElement.textContent;
      const secondsMatch = timerText.match(/Seconds left:\s*(\d+)/);
      
      if (secondsMatch) {
        const secondsLeft = parseInt(secondsMatch[1]);
        
        if (secondsLeft > 0 && !this.isGameActive) {
          // Game started
          this.isGameActive = true;
          this.gameStartTime = Date.now();
          console.log('Game started');
        } else if (secondsLeft === 0 && this.isGameActive) {
          // Game ended
          this.handleGameEnd();
        }
      }
    }
  }

  checkForGameCompletion() {
    // Look for final score or game over indicators
    const gameOverElements = [
      'Time\'s up!',
      'Game over',
      'Final score',
      'Well done!'
    ];

    for (const text of gameOverElements) {
      if (document.body.textContent.includes(text)) {
        this.handleGameEnd();
        break;
      }
    }
  }

  findElementByText(text) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.nodeValue.includes(text)) {
        return node.parentElement;
      }
    }
    return null;
  }

  getCurrentScore() {
    // Look for score element
    const scoreElement = this.findElementByText('Score:');
    if (scoreElement) {
      const scoreText = scoreElement.textContent;
      const scoreMatch = scoreText.match(/Score:\s*(\d+)/);
      if (scoreMatch) {
        return parseInt(scoreMatch[1]);
      }
    }
    return 0;
  }

  async handleGameEnd() {
    if (!this.isGameActive) return;
    
    this.isGameActive = false;
    const finalScore = this.getCurrentScore();
    const gameEndTime = Date.now();
    const gameDuration = gameEndTime - this.gameStartTime;

    const gameData = {
      score: finalScore,
      timestamp: gameEndTime,
      duration: gameDuration,
      date: new Date(gameEndTime).toISOString().split('T')[0],
      time: new Date(gameEndTime).toTimeString().split(' ')[0]
    };

    console.log('Game ended, saving score:', gameData);

    // Save to storage
    try {
      const result = await chrome.storage.local.get(['scores']);
      const scores = result.scores || [];
      scores.push(gameData);
      
      await chrome.storage.local.set({ scores });
      console.log('Score saved successfully');
      
      // Show notification
      this.showScoreNotification(finalScore);
    } catch (error) {
      console.error('Error saving score:', error);
    }
  }

  showScoreNotification(score) {
    // Create a small notification overlay
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    notification.textContent = `Score ${score} saved to tracker!`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize the tracker when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ZetamacTracker();
  });
} else {
  new ZetamacTracker();
}

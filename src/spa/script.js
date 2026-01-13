const {By, Builder, Browser} = require('selenium-webdriver');

const start = async () => {
  try {
    const driver = await new Builder().forBrowser(Browser.CHROME).build();
    await driver.get('https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/spa/');
    await move(driver)
    await driver.quit();
  } catch(e) {
    console.log(e)
  }
}
start()

async function move(driver) {
  const message = await getMessage(driver)
  const cells = await driver.findElements(By.className('cell'))
  const game = await getGameState(cells)

  if (isGameOver(message)) {
    console.log({ game, message, isGameOver: true })
    return;
  }

  const coord = findBestMove(arrayToMatrix(game), 'X');
  if (coord) {
      const [row, col] = coord;
      await cells[row * 8 + col].click()
      await sleep(500)
      await move(driver)
  }
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

function isGameOver(message) {
  if (message === "AI wins!" || message === "You win!") {
    return true
  }
  return false
}


async function getMessage(driver) {
  const el = await driver.findElement(By.id('message'))
  return (await el.getText()).trim()
}

function arrayToMatrix(array) {
  const result = []
  for (let i = 0; i < 8; i++) {
    result.push(array.slice(i * 8, i * 8 + 8))
  }
  return result
}

async function getGameState(cells) {
  const result = []
  for (let el of cells) {
    const text = await el.getText();
    if (text === 'X') {
      result.push('X')
    } else if (text === 'O') {
      result.push('O')
    } else {
      result.push(null)
    }
  }
  return result
}


function findBestMove(board, player = 'X') {
    const opponent = player === 'X' ? 'O' : 'X';

    let move = findWinningMove(board, player);
    if (move) return move;

    move = findWinningMove(board, opponent);
    if (move) return move;

    move = findDoubleThreat(board, player);
    if (move) return move;

    move = findDoubleThreat(board, opponent);
    if (move) return move;

    return getBestDevelopingMove(board);
}


function findWinningMove(board, mark) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (!board[r][c]) {
                board[r][c] = mark;
                if (hasFourInRow(board, r, c, mark)) {
                    board[r][c] = null;
                    return [r, c];
                }
                board[r][c] = null;
            }
        }
    }
    return null;
}


function findDoubleThreat(board, mark) {
    let bestMove = null;
    let maxThreats = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (!board[r][c]) {
                board[r][c] = mark;
                const threats = countImmediateThreats(board, mark);
                board[r][c] = null;

                if (threats > maxThreats) {
                    maxThreats = threats;
                    bestMove = [r, c];
                }
            }
        }
    }

    return maxThreats >= 2 ? bestMove : null;
}


function countImmediateThreats(board, mark) {
    let count = 0;
    const opponent = mark === 'X' ? 'O' : 'X';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (!board[r][c]) {
                board[r][c] = mark;
                if (hasFourInRow(board, r, c, mark)) {
                    count++;
                }
                board[r][c] = null;
            }
        }
    }
    return count;
}


function hasFourInRow(board, row, col, mark) {
    const directions = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1]
    ];

    for (const [dr, dc] of directions) {
        let count = 1;

        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === mark) {
            count++;
            r += dr;
            c += dc;
        }

        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === mark) {
            count++;
            r -= dr;
            c -= dc;
        }

        if (count >= 4) return true;
    }
    return false;
}


function getBestDevelopingMove(board) {
    const priority = [
        [3,3], [4,4], [3,4], [4,3],
        [2,3], [3,2], [4,5], [5,4],
        [2,4], [4,2], [3,5], [5,3],
        [2,2], [2,5], [5,2], [5,5],
    ];

    for (const [r, c] of priority) {
        if (!board[r][c]) return [r, c];
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (!board[r][c]) return [r, c];
        }
    }

    return null;
}

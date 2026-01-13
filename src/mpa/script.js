const jsdom = require("jsdom");
const { JSDOM } = jsdom;

let COOKIE = null;

const start = async () => {
  try {
    await initCookie()
    await move()
  } catch (e) {
    console.error(e)
  }
}
start()

async function move() {
  const data = await getData()
  const { game, isGameOver } = data

  if (isGameOver || !game) {
    console.log(data)
    return;
  }

  const coord = findBestMove(arrayToMatrix(game), 'X');
  if (coord) {
      const [row, col] = coord;
      await sendCellData(row * 8 + col)
      await move()
  }
}

async function getData() {
  const url = "https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/mpa/index.php";

  try {
    const response = await fetch(url, {  method: "GET", headers: { "Cookie": COOKIE } });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data = await response.text();
    const dom = new JSDOM(data);

    const formElement = dom.window.document.querySelector("form");
    const game = formElement ? getGameState(formElement) : null

    const messageElement = dom.window.document.querySelector(".message")
    const message = messageElement ? messageElement.innerHTML.trim() : "Что-то пошло не так"

    return { game, message, isGameOver: isGameOver(message) }
  } catch (error) {
    console.error(error.message);
  }
}

async function initCookie() {
  try {
    const response = await fetch("https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/mpa/index.php", {
      method: "GET",
      headers: { ...(COOKIE && { "Cookie": COOKIE }) }
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    COOKIE = response.headers.getSetCookie()[0].split('; ')[0]

  } catch (error) {
    console.error(error.message);
  }
}

async function sendCellData(cell) {
  const url = "https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/mpa/index.php";
  const formData = new FormData();
  formData.append("cell", cell);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers: { ...(COOKIE && { "Cookie": COOKIE }) }
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error(error.message);
  }
}

function isGameOver(message) {
  if (message === "AI wins!" || message === "You win!") {
    return true
  }
  return false
}

function arrayToMatrix(array) {
  const result = []
  for (let i = 0; i < 8; i++) {
    result.push(array.slice(i * 8, i * 8 + 8))
  }
  return result
}

function getGameState(form) {
  const formChildren = Array.from(form.children);
  return formChildren.map((item,i)=>{
    if (item.classList.contains("x")) {
      return 'X'
    } else if (item.classList.contains("o")) {
      return 'O'
    } else {
      return null
    }
  })
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

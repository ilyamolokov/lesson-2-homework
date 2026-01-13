
let COOKIE = null;

let BOARD = null;
let MESSAGE = null;
let GAME_OVER = null;

const start = async () => {
  await initCookie()
  await move()
}
start()

async function move() {
  const data = await getData();

  BOARD = data.board
  MESSAGE = data.message
  GAME_OVER = data.gameOver

  if (GAME_OVER) {
    console.log({ BOARD, MESSAGE, GAME_OVER })
    return
  }

  const xTurnCoords = findBestMove(arrayToMatrix(BOARD), 'X');
  if (xTurnCoords) {
      const [row, col] = xTurnCoords;
      BOARD[row * 8 + col] = 'X'
      if (checkWin("X")) {
        MESSAGE = "You win"
        GAME_OVER = true;
      } else if (!(BOARD.includes(""))) {
        MESSAGE = "Draw!"
        GAME_OVER = true;
      } else {
        MESSAGE = "Your turn (O)"
      }
  }

  const aiMove = getAIMove()
  if (aiMove) {
    BOARD[aiMove] = "O";
    if (checkWin("O")) {
      MESSAGE = "AI wins!"
      GAME_OVER = true;
    } else if (!(BOARD.includes(""))) {
      MESSAGE = "Draw!"
      GAME_OVER = true;
    } else {
      MESSAGE = "Your turn (X)"
    }
  }

  await postData({ action: "save", message: MESSAGE, gameOver: GAME_OVER, board: BOARD })
  await move()
}

async function getData() {
  try {
    const response = await fetch("https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/spa/api.php", { method: "GET", headers: {
      ...(COOKIE && { "Cookie": COOKIE })
    }});
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(error.message);
  }
}

async function initCookie() {
  try {
    const response = await fetch("https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/spa/api.php", { method: "GET" });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    COOKIE = response.headers.getSetCookie()[0].split('; ')[0]

  } catch (error) {
    console.error(error.message);
  }
}

async function postData(body) {
  try {
    const response = await fetch("https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/spa/api.php", {
      method: "POST",
      credentials: 'include',
      headers: { ...(COOKIE && { "Cookie": COOKIE }) },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(error.message);
  }
}



function arrayToMatrix(array) {
  const result = []
  for (let i = 0; i < 8; i++) {
    result.push(array.slice(i * 8, i * 8 + 8))
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

function getAIMove() {
  let move = findWinningAIMove("O");
  if (move !== null) return move;

  move = findWinningAIMove("X");
  if (move !== null) return move;

  move = findOpenThree("O");
  if (move !== null) return move;

  move = findOpenThree("X");
  if (move !== null) return move;

  move = extendLine("O");
  if (move !== null) return move;

  move = extendLine("X");
  if (move !== null) return move;

  move = moveNearby();
  if (move !== null) return move;

  const center = [27, 28, 35, 36];
  for (const pos of center) {
    if (BOARD[pos] === "") return pos;
  }

  const empty = BOARD
    .map((v, i) => (v === "" ? i : null))
    .filter((v) => v !== null);
  return empty.length
    ? empty[Math.floor(Math.random() * empty.length)]
    : null;
}

function checkWin(player) {
  const size = 8;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const pos = row * size + col;
      if (BOARD[pos] !== player) continue;

      if (col <= 4 && checkLine(pos, 1, 4, player)) return true;
      if (row <= 4 && checkLine(pos, size, 4, player)) return true;
      if (row <= 4 && col <= 4 && checkLine(pos, size + 1, 4, player))
        return true;
      if (row <= 4 && col >= 3 && checkLine(pos, size - 1, 4, player))
        return true;
    }
  }
  return false;
}

function checkLine(start, step, count, player) {
  for (let i = 0; i < count; i++) {
    if (BOARD[start + i * step] !== player) return false;
  }
  return true;
}

function extendLine(player) {
  const size = 8;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const pos = row * size + col;
      if (BOARD[pos] !== player) continue;

      for (const [dr, dc] of directions) {
        for (let dist = 1; dist <= 3; dist++) {
          const r = row + dist * dr;
          const c = col + dist * dc;
          if (r < 0 || r >= size || c < 0 || c >= size) break;
          const p = r * size + c;
          if (BOARD[p] === "") return p;
          if (BOARD[p] !== player) break;
        }
      }
    }
  }
  return null;
}

function moveNearby() {
  const size = 8;
  const neighbors = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const pos = row * size + col;
      if (BOARD[pos] === "") continue;

      for (const [dr, dc] of neighbors) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) {
          const p = r * size + c;
          if (BOARD[p] === "") return p;
        }
      }
    }
  }
  return null;
}

function findOpenThree(player) {
  const size = 8;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const pos = row * size + col;
      if (BOARD[pos] !== "") continue;

      BOARD[pos] = player;
      const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1],
      ];

      for (const [dr, dc] of directions) {
        let count = 1;
        let openEnds = 0;

        for (let k = 1; k < 4; k++) {
          const r = row + k * dr;
          const c = col + k * dc;
          if (r < 0 || r >= size || c < 0 || c >= size) break;
          const p = r * size + c;
          if (BOARD[p] === player) count++;
          else {
            if (BOARD[p] === "") openEnds++;
            break;
          }
        }

        for (let k = 1; k < 4; k++) {
          const r = row - k * dr;
          const c = col - k * dc;
          if (r < 0 || r >= size || c < 0 || c >= size) break;
          const p = r * size + c;
          if (BOARD[p] === player) count++;
          else {
            if (BOARD[p] === "") openEnds++;
            break;
          }
        }

        if (count >= 3 && openEnds >= 2) {
          BOARD[pos] = "";
          return pos;
        }
      }
      BOARD[pos] = "";
    }
  }
  return null;
}

function findWinningAIMove(player) {
  for (let i = 0; i < 64; i++) {
    if (BOARD[i] === "") {
      BOARD[i] = player;
      const wins = checkWin(player);
      BOARD[i] = "";
      if (wins) return i;
    }
  }
  return null;
}

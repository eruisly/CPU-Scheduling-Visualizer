function toggleQuantum() {
  const algo = document.getElementById("algorithm").value;

  // Show/hide Time Quantum
  const qField = document.getElementById("quantum");
  const qLabel = document.getElementById("quantum-label");
  if (algo === "RR") {
    qField.style.display = "block";
    qLabel.style.display = "block";
  } else {
    qField.style.display = "none";
    qLabel.style.display = "none";
  }

  const priorityDiv = document.getElementById("priority-input");
  if (algo === "PRIORITY_NP" || algo === "PRIORITY_P") {
    priorityDiv.style.display = "block";
  } else {
    priorityDiv.style.display = "none";
  }
}

function solve() {
  const algo = document.getElementById("algorithm").value;
  const at = document.getElementById("arrivalTimes").value.trim().split(" ").map(Number);
  const bt = document.getElementById("burstTimes").value.trim().split(" ").map(Number);
  const prios = document.getElementById("priorities").value.trim().split(" ").map(Number); // ✅ ADDED
  const q = parseInt(document.getElementById("quantum").value);

  if (at.length !== bt.length || at.includes(NaN) || bt.includes(NaN)) {
    alert("Invalid input: Ensure arrival and burst times are valid and of same length.");
    return;
  }

  let result;
  switch (algo) {
    case "FCFS":
      result = fcfs(at, bt);
      break;
    case "SJFNP":
      result = sjfNonPreemptive(at, bt);
      break;
    case "SJFP":
      result = sjfPreemptive(at, bt);
      break;
    case "PRIORITY_NP":
      result = priorityNonPreemptive(at, bt, prios); // ✅ ADDED
      break;
    case "PRIORITY_P":
      result = priorityPreemptive(at, bt, prios); // ✅ ADDED
      break;
    case "RR":
      if (isNaN(q) || q <= 0) {
        alert("Please enter a valid time quantum.");
        return;
      }
      result = roundRobin(at, bt, q);
      break;
  }
  displayResult(result);
}


function displayResult({ ganttChart, readyQueueTimeline, processTable, avgTAT, avgWT }) {
  document.getElementById("gantt-chart").innerHTML = "<h3>Gantt Chart</h3>" + ganttChart;

  let readyHTML = "<h3>Ready Queue Timeline</h3>";
for (let entry of readyQueueTimeline) {
  readyHTML += `<div class="ready-queue-row">
                <span class="ready-queue-time">Time ${entry.time}:</span>`;
for (let p of entry.queue) {
  readyHTML += `<span class="ready-queue-process">${p}</span>`;
}
readyHTML += `</div>`;

}
  document.getElementById("ready-queue").innerHTML = readyHTML;

  document.getElementById("table-output").innerHTML = "<h3>Process Table</h3>" + processTable;
  document.getElementById("averages").innerHTML = `<p><strong>Average Turnaround Time:</strong> ${avgTAT.toFixed(2)}</p>
                                                   <p><strong>Average Waiting Time:</strong> ${avgWT.toFixed(2)}</p>`;
}

function fcfs(at, bt) {
  let n = at.length, ct = [], tat = [], wt = [], time = 0, gantt = "";
  const order = at.map((val, i) => [val, i]).sort((a, b) => a[0] - b[0]);
  const readyTimeline = [];

  let queue = [];
  for (let t = 0; t <= Math.max(...at) + bt.reduce((a, b) => a + b, 0); t++) {
    for (let i = 0; i < n; i++) {
      if (at[i] === t) queue.push(i);
    }
    if (queue.length > 0) readyTimeline.push({ time: t, queue: queue.map(i => "P" + i) });
  }

  for (let [_, i] of order) {
    if (time < at[i]) time = at[i];
    gantt += `<span>P${i} (${time}-${time + bt[i]})</span>`;
    time += bt[i];
    ct[i] = time;
    tat[i] = ct[i] - at[i];
    wt[i] = tat[i] - bt[i];
  }

  return buildResultTable(at, bt, ct, tat, wt, gantt, readyTimeline);
}

function sjfNonPreemptive(at, bt) {
  let n = at.length, ct = Array(n), tat = [], wt = [], time = 0, done = 0, gantt = "";
  let completed = Array(n).fill(false), readyTimeline = [];

  while (done < n) {
    let ready = [];
    let idx = -1, minBT = Infinity;
    for (let i = 0; i < n; i++) {
      if (!completed[i] && at[i] <= time) {
        ready.push(i);
        if (bt[i] < minBT) {
          minBT = bt[i];
          idx = i;
        }
      }
    }
    if (ready.length > 0) {
      readyTimeline.push({ time, queue: ready.map(i => "P" + i) });
    }

    if (idx === -1) {
      time++;
    } else {
      gantt += `<span>P${idx} (${time}-${time + bt[idx]})</span>`;
      time += bt[idx];
      ct[idx] = time;
      tat[idx] = ct[idx] - at[idx];
      wt[idx] = tat[idx] - bt[idx];
      completed[idx] = true;
      done++;
    }
  }

  return buildResultTable(at, bt, ct, tat, wt, gantt, readyTimeline);
}

function sjfPreemptive(at, bt) {
  const n = at.length;
  let rt = [...bt], ct = Array(n), time = 0, complete = 0, gantt = "", last = -1;
  let tat = [], wt = [], readyTimeline = [];

  while (complete < n) {
    let idx = -1, min = Infinity, ready = [];
    for (let i = 0; i < n; i++) {
      if (at[i] <= time && rt[i] > 0) {
        ready.push(i);
        if (rt[i] < min) {
          min = rt[i];
          idx = i;
        }
      }
    }
    if (ready.length > 0) {
      readyTimeline.push({ time, queue: ready.map(i => "P" + i) });
    }

    if (idx === -1) {
      time++;
      continue;
    }

    if (last !== idx) gantt += `<span>P${idx} (${time}-`;
    rt[idx]--;
    time++;
    if (rt[idx] === 0) {
      ct[idx] = time;
      complete++;
      gantt += `${time})</span>`;
    } else if (last !== idx && last !== -1) {
      gantt = gantt.replace(/-\d+\)<\/span>$/, `${time})</span>`);
    }
    last = idx;
  }

  for (let i = 0; i < n; i++) {
    tat[i] = ct[i] - at[i];
    wt[i] = tat[i] - bt[i];
  }

  return buildResultTable(at, bt, ct, tat, wt, gantt, readyTimeline);
}

function roundRobin(at, bt, q) {
  const n = at.length, ct = Array(n), rt = [...bt];
  let time = 0, queue = [], visited = Array(n).fill(false), completed = 0, gantt = "";
  let readyTimeline = [];

  while (completed < n) {
    for (let i = 0; i < n; i++) {
      if (at[i] <= time && !visited[i]) {
        queue.push(i);
        visited[i] = true;
      }
    }

    if (queue.length > 0) readyTimeline.push({ time, queue: queue.map(i => "P" + i) });

    if (queue.length === 0) {
      time++;
      continue;
    }

    let idx = queue.shift();
    let exec = Math.min(q, rt[idx]);
    gantt += `<span>P${idx} (${time}-${time + exec})</span>`;
    rt[idx] -= exec;
    time += exec;

    for (let i = 0; i < n; i++) {
      if (at[i] > time - exec && at[i] <= time && !visited[i]) {
        queue.push(i);
        visited[i] = true;
      }
    }

    if (rt[idx] > 0) queue.push(idx);
    else {
      ct[idx] = time;
      completed++;
    }
  }

  let tat = [], wt = [];
  for (let i = 0; i < n; i++) {
    tat[i] = ct[i] - at[i];
    wt[i] = tat[i] - bt[i];
  }

  return buildResultTable(at, bt, ct, tat, wt, gantt, readyTimeline);
}

function buildResultTable(at, bt, ct, tat, wt, gantt, readyQueueTimeline) {
  let table = `<table><tr><th>PID</th><th>AT</th><th>BT</th><th>CT</th><th>TAT</th><th>WT</th></tr>`;
  for (let i = 0; i < at.length; i++) {
    table += `<tr><td>P${i}</td><td>${at[i]}</td><td>${bt[i]}</td><td>${ct[i]}</td><td>${tat[i]}</td><td>${wt[i]}</td></tr>`;
  }
  table += `</table>`;
  const avgTAT = tat.reduce((a, b) => a + b, 0) / at.length;
  const avgWT = wt.reduce((a, b) => a + b, 0) / at.length;
  return { ganttChart: gantt, processTable: table, avgTAT, avgWT, readyQueueTimeline };
}

function priorityNonPreemptive(at, bt, prios) {
  const n = at.length;
  const completed = Array(n).fill(false), ct = Array(n), tat = Array(n), wt = Array(n);
  let time = 0, done = 0, gantt = "", readyTimeline = [];

  while (done < n) {
    let ready = [];
    let idx = -1, minPr = Infinity;
    for (let i = 0; i < n; i++) {
      if (!completed[i] && at[i] <= time) {
        ready.push(i);
        if (prios[i] < minPr) {
          minPr = prios[i];
          idx = i;
        }
      }
    }

    if (ready.length > 0) {
      readyTimeline.push({ time, queue: ready.map(i => "P" + i) });
    }

    if (idx === -1) {
      time++;
      continue;
    }

    gantt += `<span>P${idx} (${time}-${time + bt[idx]})</span>`;
    time += bt[idx];
    ct[idx] = time;
    tat[idx] = ct[idx] - at[idx];
    wt[idx] = tat[idx] - bt[idx];
    completed[idx] = true;
    done++;
  }

  return buildResultTable(at, bt, ct, tat, wt, gantt, readyTimeline);
}
function priorityPreemptive(at, bt, prios) {
  const n = at.length;
  const rt = [...bt], ct = Array(n), tat = [], wt = [], completed = Array(n).fill(false);
  let time = 0, done = 0, gantt = "", last = -1, readyTimeline = [];

  while (done < n) {
    let ready = [];
    let idx = -1, minPr = Infinity;
    for (let i = 0; i < n; i++) {
      if (!completed[i] && at[i] <= time && rt[i] > 0) {
        ready.push(i);
        if (prios[i] < minPr) {
          minPr = prios[i];
          idx = i;
        }
      }
    }

    if (ready.length > 0) {
      readyTimeline.push({ time, queue: ready.map(i => "P" + i) });
    }

    if (idx === -1) {
      time++;
      continue;
    }

    if (last !== idx) gantt += `<span>P${idx} (${time}-`;
    rt[idx]--;
    time++;

    if (rt[idx] === 0) {
      ct[idx] = time;
      completed[idx] = true;
      done++;
      gantt += `${time})</span>`;
    } else if (last !== idx && last !== -1) {
      gantt = gantt.replace(/-\d+\)<\/span>$/, `${time})</span>`);
    }

    last = idx;
  }

  for (let i = 0; i < n; i++) {
    tat[i] = ct[i] - at[i];
    wt[i] = tat[i] - bt[i];
  }

  return buildResultTable(at, bt, ct, tat, wt, gantt, readyTimeline);
}

window.onload = toggleQuantum;
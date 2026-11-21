import React from "react";

export default function TaskCard({ task, onToggle, onOpen }) {
  return (
    <div className="task-card" onClick={onOpen}>
      <button
        className={`checkbox ${task.completed ? "done" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {task.completed ? "✓" : ""}
      </button>

      <div className="task-body">
        <div className={`task-title ${task.completed ? "done" : ""}`}>{task.title}</div>
        {!!task.description && <div className="task-desc">{task.description}</div>}
      </div>

      {task.important && <span className="star">★</span>}
      {!!task.time && <span className="task-meta">{task.time}</span>}
    </div>
  );
}

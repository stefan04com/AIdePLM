import type { Task } from '../../api/types'
import { Card } from '../ui'

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null

  return (
    <Card title="Follow-up tasks (go to Slack on ship)">
      <ul className="task-list">
        {tasks.map((task, index) => (
          <li key={index}>
            <strong>{task.owner}</strong> · {task.task} <span className="muted">· {task.due}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

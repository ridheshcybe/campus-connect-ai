// apps/web-admin/src/components/CallLogTable.tsx

export interface CallLogEntry {
  id: string;
  callerNumber: string;
  time: string;
  language: string;
  issueCategory: string;
  status: "resolved" | "pending" | "escalated";
}

const dummyCalls: CallLogEntry[] = [
  {
    id: "1",
    callerNumber: "+91-9876543210",
    time: "2026-07-16 09:15",
    language: "Tamil",
    issueCategory: "Fees",
    status: "resolved",
  },
  {
    id: "2",
    callerNumber: "+91-8765432109",
    time: "2026-07-16 09:42",
    language: "English",
    issueCategory: "Admission",
    status: "pending",
  },
  {
    id: "3",
    callerNumber: "+91-7654321098",
    time: "2026-07-16 10:05",
    language: "Hindi",
    issueCategory: "Hostel",
    status: "escalated",
  },
  {
    id: "4",
    callerNumber: "+91-6543210987",
    time: "2026-07-16 10:30",
    language: "Telugu",
    issueCategory: "Transport",
    status: "pending",
  },
  {
    id: "5",
    callerNumber: "+91-5432109876",
    time: "2026-07-16 11:00",
    language: "Malayalam",
    issueCategory: "Placements",
    status: "resolved",
  },
];

export interface CallLogTableProps {
  calls?: CallLogEntry[];
}

export function CallLogTable({ calls = dummyCalls }: CallLogTableProps) {
  return (
    <table className="call-log-table">
      <thead>
        <tr>
          <th>Caller Number</th>
          <th>Time</th>
          <th>Language</th>
          <th>Issue Category</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {calls.map((call) => (
          <tr key={call.id}>
            <td>{call.callerNumber}</td>
            <td>{call.time}</td>
            <td>{call.language}</td>
            <td>{call.issueCategory}</td>
            <td>
              <span className={`status-badge status-badge--${call.status}`}>
                {call.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

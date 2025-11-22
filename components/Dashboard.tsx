import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const data = [
  { name: 'Mon', commits: 12, reviews: 5 },
  { name: 'Tue', commits: 19, reviews: 8 },
  { name: 'Wed', commits: 8, reviews: 12 },
  { name: 'Thu', commits: 25, reviews: 15 },
  { name: 'Fri', commits: 20, reviews: 10 },
  { name: 'Sat', commits: 5, reviews: 2 },
  { name: 'Sun', commits: 10, reviews: 4 },
];

export const Dashboard: React.FC = () => {
  return (
    <div className="h-full p-8 overflow-y-auto custom-scrollbar">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Welcome back, Dev.</h1>
        <p className="text-gray-400 mt-2">Here's your activity overview for the week.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Total Commits</h3>
            <span className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-1 rounded">+12%</span>
          </div>
          <p className="text-3xl font-bold text-white">1,248</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-gray-400 text-sm font-medium">Code Reviews</h3>
             <span className="text-primary-400 text-xs font-bold bg-primary-400/10 px-2 py-1 rounded">+5%</span>
          </div>
          <p className="text-3xl font-bold text-white">342</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-gray-400 text-sm font-medium">Issues Resolved</h3>
             <span className="text-purple-400 text-xs font-bold bg-purple-400/10 px-2 py-1 rounded">+8%</span>
          </div>
          <p className="text-3xl font-bold text-white">89</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-lg h-96">
        <h3 className="text-white font-semibold mb-6">Productivity Velocity</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
            <defs>
              <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="name" stroke="#4b5563" tick={{fill: '#9ca3af'}} tickLine={false} axisLine={false} />
            <YAxis stroke="#4b5563" tick={{fill: '#9ca3af'}} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
            <Area type="monotone" dataKey="commits" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCommits)" strokeWidth={2} />
            <Area type="monotone" dataKey="reviews" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorReviews)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
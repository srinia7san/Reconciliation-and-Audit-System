import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function ReconciliationChart({ uploadJobs }) {
  // Filter completed jobs for chart data
  const completedJobs = uploadJobs.filter(job => job.status === "Completed");

  // Bar chart data for upload trends
  const barChartData = {
    labels: completedJobs.map(job => 
      new Date(job.processedAt).toLocaleDateString()
    ).slice(-10), // Last 10 jobs
    datasets: [
      {
        label: 'Total Records',
        data: completedJobs.map(job => job.totalRecords).slice(-10),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Matched Records',
        data: completedJobs.map(job => job.matchedRecords).slice(-10),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      }
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Upload Trends',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Records'
        },
        beginAtZero: true
      }
    }
  };

  // Doughnut chart data for overall statistics
  const totalRecords = completedJobs.reduce((sum, job) => sum + (job.totalRecords || 0), 0);
  const totalMatched = completedJobs.reduce((sum, job) => sum + (job.matchedRecords || 0), 0);
  const totalUnmatched = totalRecords - totalMatched;

  const doughnutData = {
    labels: ['Matched', 'Unmatched'],
    datasets: [
      {
        data: [totalMatched, totalUnmatched],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Overall Match Rate',
      },
    },
  };

  if (completedJobs.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No completed uploads yet. Upload files to see analytics.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <Bar data={barChartData} options={barChartOptions} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <Doughnut data={doughnutData} options={doughnutOptions} />
        <div className="text-center mt-4">
          <p className="text-lg font-semibold">
            Overall Accuracy: {totalRecords > 0 ? ((totalMatched / totalRecords * 100).toFixed(2)) : 0}%
          </p>
          <p className="text-sm text-gray-600">
            {totalMatched} matched out of {totalRecords} total records
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReconciliationChart;
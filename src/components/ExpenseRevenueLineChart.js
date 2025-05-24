import React from "react";
import PropTypes from "prop-types"; // Make sure PropTypes is imported correctly
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Registering the chart elements
ChartJS.register(CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend);

const ExpenseRevenueLineChart = ({ title, description, data, date }) => {
  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: "Expense",
        data: data.map((item) => item.expense),
        borderColor: "#FF5733",
        backgroundColor: "rgba(255, 87, 51, 0.2)",
        fill: true,
      },
      {
        label: "Revenue",
        data: data.map((item) => item.revenue),
        borderColor: "#33B5FF",
        backgroundColor: "rgba(51, 181, 255, 0.2)",
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: { grid: { drawBorder: false } },
      y: {
        grid: { drawBorder: false },
        ticks: { beginAtZero: true },
      },
    },
    plugins: {
      legend: { display: true },
      tooltip: { mode: "index" },
    },
  };

  return (
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Line data={chartData} options={options} />
      <small>{date}</small>
    </div>
  );
};

// Adding PropTypes validation
ExpenseRevenueLineChart.propTypes = {
  title: PropTypes.string.isRequired, // Ensuring 'title' is a string
  description: PropTypes.string.isRequired, // Ensuring 'description' is a string
  data: PropTypes.arrayOf(
    // Ensuring 'data' is an array of objects with required keys
    PropTypes.shape({
      month: PropTypes.string.isRequired, // Each item in 'data' has a 'month' key which is a string
      expense: PropTypes.number.isRequired, // Each item has an 'expense' key which is a number
      revenue: PropTypes.number.isRequired, // Each item has a 'revenue' key which is a number
    })
  ).isRequired,
  date: PropTypes.string.isRequired, // Ensuring 'date' is a string
};

export default ExpenseRevenueLineChart;

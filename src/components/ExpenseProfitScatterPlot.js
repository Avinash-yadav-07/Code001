import React from "react";
import PropTypes from "prop-types"; // Import PropTypes
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

const ExpenseProfitScatterPlot = ({ title, description, data, date }) => {
  const chartData = {
    datasets: [
      {
        label: "Expense vs Profit Margin",
        data: data.map((item) => ({
          x: item.expense,
          y: item.profitMargin,
        })),
        backgroundColor: "#FF5733",
        borderColor: "#FF5733",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Expense" } },
      y: { title: { display: true, text: "Profit Margin (%)" }, min: 0, max: 100 },
    },
    plugins: {
      legend: { display: false },
      tooltip: { mode: "nearest" },
    },
  };

  return (
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Scatter data={chartData} options={options} />
      <small>{date}</small>
    </div>
  );
};

// Adding PropTypes validation
ExpenseProfitScatterPlot.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      expense: PropTypes.number.isRequired,
      profitMargin: PropTypes.number.isRequired,
    })
  ).isRequired,
  date: PropTypes.string.isRequired,
};

export default ExpenseProfitScatterPlot;

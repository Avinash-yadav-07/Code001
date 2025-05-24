// src/examples/Charts/PieChart/index.js
import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function PieChart({ title, description, data, onClick, isActive }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);

      const option = {
        tooltip: {
          trigger: "item",
          formatter: "{a} <br/>{b} : {c} ({d}%)",
        },
        series: [
          {
            name: title, // Use the title prop
            type: "pie",
            radius: "85%",
            center: ["50%", "50%"], // Center the chart
            data: data, // Use the data prop
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
            label: {
              show: false, // Hide labels on the chart body
            },
            labelLine: {
              show: false, // Hide label lines
            },
          },
        ],
      };

      myChart.setOption(option);

      // Cleanup on unmount
      return () => {
        myChart.dispose();
      };
    }
  }, [data, title]);

  return (
    <Card
      onClick={onClick}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: isActive ? "2px solid #3f51b5" : "1px solid #e0e0e0", // Add border for active card
        boxShadow: isActive ? "0 4px 8px rgba(0, 0, 0, 0.2)" : "none", // Add shadow for active card
      }}
    >
      <MDBox py={2} pr={2} pl={2} flexGrow={1} display="flex" flexDirection="column">
        {title && <MDTypography variant="h6">{title}</MDTypography>}
        {description && (
          <MDTypography component="div" variant="button" color="text">
            {description}
          </MDTypography>
        )}
        <div ref={chartRef} style={{ width: "100%", flexGrow: 1, minHeight: "300px" }} />
      </MDBox>
    </Card>
  );
}

PieChart.defaultProps = {
  title: "",
  description: "",
  onClick: () => {},
  isActive: false,
};

PieChart.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  onClick: PropTypes.func,
  isActive: PropTypes.bool,
};

export default PieChart;

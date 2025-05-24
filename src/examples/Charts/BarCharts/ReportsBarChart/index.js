// src/examples/Charts/BarCharts/ReportsBarChart/index.js
import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Typography from "@mui/material/Typography";

function ReportsBarChart({
  title,
  description,
  chart,
  onClick,
  isActive,
  profitLoss,
  runwayMonths,
}) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);

      const option = {
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "cross",
            crossStyle: {
              color: "#999",
            },
          },
        },
        toolbox: {
          feature: {
            saveAsImage: { show: true }, // Only show the download button
          },
        },
        legend: {
          data: chart.labels || [],
        },
        xAxis: [
          {
            type: "category",
            data: chart.xAxisData || [],
            axisPointer: {
              type: "shadow",
            },
          },
        ],
        yAxis: chart.yAxis || {
          type: "value",
          name: chart.yAxisName || "Value",
          min: 0,
          max: Math.max(...(chart.seriesData?.[0]?.data || [])) + 50,
          interval: 50,
          axisLabel: {
            formatter: `{value} ${chart.yAxisUnit || ""}`,
          },
        },
        series: chart.seriesData || [],
      };

      myChart.setOption(option);

      // Cleanup on unmount
      return () => {
        myChart.dispose();
      };
    }
  }, [chart]);

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
      <MDBox py={2} pr={2} pl={2}>
        {title && <MDTypography variant="h6">{title}</MDTypography>}
        {description && (
          <MDTypography component="div" variant="button" color="text">
            {description}
          </MDTypography>
        )}
        <div ref={chartRef} style={{ width: "100%", height: "300px" }} />
        {/* Display profit or loss below the chart */}
        {profitLoss !== undefined && (
          <MDBox mt={2} textAlign="center">
            <Typography
              variant="h6"
              color={profitLoss >= 0 ? "success.main" : "error.main"} // Green for profit, red for loss
            >
              {profitLoss >= 0 ? `Profit: $${profitLoss}` : `Loss: $${Math.abs(profitLoss)}`}
            </Typography>
          </MDBox>
        )}
        {/* Display runway months further down in the card */}
        {runwayMonths !== undefined && (
          <MDBox mt={4} textAlign="center">
            {" "}
            {/* Increased margin-top to 4 */}
            <Typography
              variant="h6"
              color={runwayMonths >= 0 ? "success.main" : "error.main"} // Green for positive, red for negative
            >
              Runway: {runwayMonths.toFixed(2)} months
            </Typography>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

ReportsBarChart.defaultProps = {
  title: "",
  description: "",
  onClick: () => {},
  isActive: false,
  profitLoss: undefined, // Default value for profitLoss
  runwayMonths: undefined, // Default value for runwayMonths
};

ReportsBarChart.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  chart: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string),
    xAxisData: PropTypes.arrayOf(PropTypes.string),
    yAxisName: PropTypes.string,
    yAxisUnit: PropTypes.string,
    seriesData: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        type: PropTypes.string,
        data: PropTypes.arrayOf(PropTypes.number),
      })
    ),
    yAxis: PropTypes.shape({
      type: PropTypes.string,
      name: PropTypes.string,
      min: PropTypes.number,
      max: PropTypes.number,
      axisLabel: PropTypes.shape({
        formatter: PropTypes.string,
      }),
    }),
  }).isRequired,
  onClick: PropTypes.func,
  isActive: PropTypes.bool,
  profitLoss: PropTypes.number, // Add prop validation for profitLoss
  runwayMonths: PropTypes.number, // Add prop validation for runwayMonths
};

export default ReportsBarChart;

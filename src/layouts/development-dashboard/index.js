import React, { useState, useEffect } from "react";
import { Grid, Card, Box, Typography } from "@mui/material";
import { db } from "../manage-employee/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const DevelopmentDashboard = () => {
  const [records, setRecords] = useState([]);
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  // Fetch development records
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "developmentRecords"));
        const recordsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate()
            : new Date(doc.data().createdAt),
        }));
        setRecords(recordsData);
      } catch (error) {
        console.error("Error fetching development records:", error);
      }
    };

    fetchRecords();
  }, []);

  // Prepare data for charts
  const labels = records.map((rec) => rec.createdAt.toLocaleDateString());
  const featureUtilizationData = records.map((rec) => rec.featureUtilizationRate);
  const bugResolutionData = records.map((rec) => rec.bugResolutionTime);
  const defectDensityData = records.map((rec) => rec.qaDefectDensity);
  const crashFreeData = records.map((rec) => rec.productCrashFreeSessions);
  const releaseFrequencyData = records.map((rec) => rec.releaseFrequency);

  // Chart configurations
  const featureAdoptionChart = {
    data: {
      labels,
      datasets: [
        {
          label: "Feature Utilization Rate (%)",
          data: featureUtilizationData,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Feature Adoption Rates" } },
    },
  };

  const bugResolutionChart = {
    data: {
      labels,
      datasets: [
        {
          label: "Bug Resolution Time (hours)",
          data: bugResolutionData,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Bug Resolution Time" } },
    },
  };

  const defectDensityChart = {
    data: {
      labels,
      datasets: [
        {
          label: "QA Defect Density (per KLOC)",
          data: defectDensityData,
          borderColor: "rgba(54, 162, 235, 1)",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Defect Density Over Time" } },
    },
  };

  const crashFreeChart = {
    data: {
      labels,
      datasets: [
        {
          label: "Crash-Free Sessions (%)",
          data: crashFreeData,
          borderColor: "rgba(153, 102, 255, 1)",
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Crash-Free Sessions Trends" } },
    },
  };

  const releaseFrequencyChart = {
    data: {
      labels,
      datasets: [
        {
          label: "Release Frequency (per month)",
          data: releaseFrequencyData,
          borderColor: "rgba(255, 159, 64, 1)",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Release Frequency Trends" } },
    },
  };

  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "background.default" : "background.paper",
        minHeight: "100vh",
      }}
    >
      <DashboardNavbar
        absolute
        light={!darkMode}
        isMini={false}
        sx={{
          backgroundColor: darkMode ? "rgba(33, 33, 33, 0.9)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)" },
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      />
      <MDBox
        p={3}
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          marginTop: { xs: "140px", md: "100px" },
          backgroundColor: darkMode ? "background.default" : "background.paper",
          minHeight: "calc(100vh - 80px)",
          paddingTop: { xs: "32px", md: "24px" },
          zIndex: 1000,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor={darkMode ? "dark" : "info"}
                borderRadius="lg"
                coloredShadow={darkMode ? "dark" : "info"}
              >
                <MDTypography
                  variant="h6"
                  color={darkMode ? "white" : "white"}
                  sx={{
                    fontFamily: "'Poppins', 'Roboto', sans-serif",
                    fontWeight: 700,
                  }}
                >
                  Product Development Dashboard
                </MDTypography>
              </MDBox>
              <MDBox p={3}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <MDBox p={2}>
                        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
                          Feature Adoption Rates
                        </MDTypography>
                        <Bar data={featureAdoptionChart.data} options={featureAdoptionChart.options} />
                      </MDBox>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <MDBox p={2}>
                        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
                          Bug Resolution Time
                        </MDTypography>
                        <Bar data={bugResolutionChart.data} options={bugResolutionChart.options} />
                      </MDBox>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <MDBox p={2}>
                        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
                          Defect Density Over Time
                        </MDTypography>
                        <Line data={defectDensityChart.data} options={defectDensityChart.options} />
                      </MDBox>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <MDBox p={2}>
                        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
                          Crash-Free Sessions Trends
                        </MDTypography>
                        <Line data={crashFreeChart.data} options={crashFreeChart.options} />
                      </MDBox>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Card>
                      <MDBox p={2}>
                        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
                          Release Frequency Trends
                        </MDTypography>
                        <Line data={releaseFrequencyChart.data} options={releaseFrequencyChart.options} />
                      </MDBox>
                    </Card>
                  </Grid>
                </Grid>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          backgroundColor: darkMode ? "background.default" : "background.paper",
          zIndex: 1100,
        }}
      >
        <Footer />
      </Box>
    </Box>
  );
};

export default DevelopmentDashboard;
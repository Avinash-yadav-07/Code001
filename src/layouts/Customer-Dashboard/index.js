import React, { useState, useEffect } from "react";
import {
  Grid,
  Card,
  Typography,
  Box,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import {
  Bar,
  Line,
  Pie,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { Navigate } from "react-router-dom";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  format,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parse,
} from "date-fns";
import { motion } from "framer-motion";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const CustomerDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [customerMetrics, setCustomerMetrics] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [featureUsage, setFeatureUsage] = useState([]);
  const [upgrades, setUpgrades] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [dateFilterType, setDateFilterType] = useState("all");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fetch user roles and persist auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", user.email)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            setUserRoles(userDoc.roles || []);
          } else {
            setUserRoles([]);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setUserRoles([]);
        }
      } else {
        setUserRoles([]);
      }
      setLoadingRoles(false);
    });

    return () => unsubscribe();
  }, []);

  // Function to fetch all data (initial load only)
  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Fetch customers
      const customerSnapshot = await getDocs(collection(db, "customers"));
      const customersData = customerSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate
          ? doc.data().createdAt.toDate()
          : new Date(doc.data().createdAt),
        signUpDate: doc.data().signUpDate?.toDate
          ? doc.data().signUpDate.toDate()
          : null,
      }));

      // Fetch customer metrics
      const metricsSnapshot = await getDocs(collection(db, "customerMetrics"));
      const metricsData = metricsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        metricDate: doc.data().metricDate?.toDate
          ? doc.data().metricDate.toDate()
          : new Date(doc.data().metricDate),
      }));

      // Fetch other collections
      const supportSnapshot = await getDocs(collection(db, "supportTickets"));
      const supportData = supportSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        complaintDate: doc.data().complaintDate?.toDate
          ? doc.data().complaintDate.toDate()
          : null,
        resolvedDate: doc.data().resolvedDate?.toDate
          ? doc.data().resolvedDate.toDate()
          : null,
        createdAt: doc.data().createdAt?.toDate
          ? doc.data().createdAt.toDate()
          : new Date(doc.data().createdAt),
      }));

      const featureSnapshot = await getDocs(collection(db, "featureUsage"));
      const featureData = featureSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate
          ? doc.data().timestamp.toDate()
          : new Date(doc.data().timestamp),
      }));

      const upgradeSnapshot = await getDocs(collection(db, "upgrades"));
      const upgradeData = upgradeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        planUpgradeDate: doc.data().planUpgradeDate?.toDate
          ? doc.data().planUpgradeDate.toDate()
          : null,
      }));

      const cancellationSnapshot = await getDocs(
        collection(db, "cancellations")
      );
      const cancellationData = cancellationSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        cancellationDate: doc.data().cancellationDate?.toDate
          ? doc.data().cancellationDate.toDate()
          : null,
      }));

      const projectSnapshot = await getDocs(collection(db, "projects"));
      const projectsData = projectSnapshot.docs.map((doc) => ({
        id: doc.id,
        projectId: doc.data().projectId,
        name: doc.data().name || "Unnamed Project",
      }));

      setCustomers(customersData);
      setCustomerMetrics(metricsData);
      setSupportTickets(supportData);
      setFeatureUsage(featureData);
      setUpgrades(upgradeData);
      setCancellations(cancellationData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch data on mount only
  useEffect(() => {
    fetchData();
  }, []);

  // Real-time listener for customerMetrics
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "customerMetrics"),
      (snapshot) => {
        const metricsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          metricDate: doc.data().metricDate?.toDate
            ? doc.data().metricDate.toDate()
            : new Date(doc.data().metricDate),
        }));
        setCustomerMetrics(metricsData);
        console.log("Real-time metrics updated:", metricsData);
      },
      (error) => {
        console.error("Error in real-time metrics listener:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const getChartData = () => {
    const currentYear = new Date().getFullYear(); // 2025
    const startDate = startOfYear(new Date(currentYear, 0, 1)); // Jan 1, 2025
    const endDate = endOfYear(new Date(currentYear, 11, 31)); // Dec 31, 2025
    let months = eachMonthOfInterval({ start: startDate, end: endDate }).map(
      (date) => format(date, "MMM yyyy")
    );

    let filteredCustomers = customers;
    let filteredMetrics = customerMetrics;
    let filteredSupportTickets = supportTickets;
    let filteredUpgrades = upgrades;
    let filteredCancellations = cancellations;

    // Apply date filtering
    if (dateFilterType !== "all" && dateFilterType !== "custom") {
      const selectedDate = parse(dateFilterType, "yyyy-MM", new Date());
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      filteredCustomers = customers.filter(
        (c) => c.createdAt >= monthStart && c.createdAt <= monthEnd
      );
      filteredMetrics = customerMetrics.filter(
        (m) => m.metricDate >= monthStart && m.metricDate <= monthEnd
      );
      filteredSupportTickets = supportTickets.filter(
        (t) => t.createdAt >= monthStart && t.createdAt <= monthEnd
      );
      filteredUpgrades = upgrades.filter(
        (u) => u.planUpgradeDate >= monthStart && u.planUpgradeDate <= monthEnd
      );
      filteredCancellations = cancellations.filter(
        (c) =>
          c.cancellationDate >= monthStart && c.cancellationDate <= monthEnd
      );
      months = [format(selectedDate, "MMM yyyy")];
    } else if (
      dateFilterType === "custom" &&
      customStartDate &&
      customEndDate
    ) {
      filteredCustomers = customers.filter(
        (c) => c.createdAt >= customStartDate && c.createdAt <= customEndDate
      );
      filteredMetrics = customerMetrics.filter(
        (m) => m.metricDate >= customStartDate && m.metricDate <= customEndDate
      );
      filteredSupportTickets = supportTickets.filter(
        (t) => t.createdAt >= customStartDate && t.createdAt <= customEndDate
      );
      filteredUpgrades = upgrades.filter(
        (u) =>
          u.planUpgradeDate >= customStartDate &&
          u.planUpgradeDate <= customEndDate
      );
      filteredCancellations = cancellations.filter(
        (c) =>
          c.cancellationDate >= customStartDate &&
          c.cancellationDate <= customEndDate
      );
      months = eachMonthOfInterval({
        start: customStartDate,
        end: customEndDate,
      }).map((date) => format(date, "MMM yyyy"));
    }

    // Apply project ID filtering
    filteredCustomers = selectedProjectIds.length
      ? filteredCustomers.filter((c) =>
          c.projectIds?.some((pid) => selectedProjectIds.includes(pid))
        )
      : filteredCustomers;
    filteredMetrics = selectedProjectIds.length
      ? filteredMetrics.filter((m) =>
          filteredCustomers.some((c) => c.customerId === m.customerId)
        )
      : filteredMetrics;
    filteredSupportTickets = selectedProjectIds.length
      ? filteredSupportTickets.filter((t) =>
          t.projectIds?.some((pid) => selectedProjectIds.includes(pid))
        )
      : filteredSupportTickets;
    filteredUpgrades = selectedProjectIds.length
      ? filteredUpgrades.filter((u) =>
          u.projectIds?.some((pid) => selectedProjectIds.includes(pid))
        )
      : filteredUpgrades;
    filteredCancellations = selectedProjectIds.length
      ? filteredCancellations.filter((c) =>
          filteredCustomers.some((cust) => cust.customerId === c.customerId)
        )
      : filteredCancellations;

    const npsData = [];
    const csatData = [];
    const crrData = [];
    const churnData = [];
    const conversionData = [];
    const productAdoptionData = [];

    const totalFreeCustomers = filteredCustomers.filter(
      (c) => c.subscriptionTier === "free"
    ).length;
    const totalPremiumCustomers = filteredCustomers.filter(
      (c) => c.subscriptionTier === "premium"
    ).length;

    console.log("Filtered metrics:", filteredMetrics);

    months.forEach((month, index) => {
      const parsedMonth = parse(month, "MMM yyyy", new Date());
      const monthStart = startOfMonth(parsedMonth);
      const monthEnd = endOfMonth(parsedMonth);

      console.log(
        `Processing month: ${month}, Start: ${monthStart}, End: ${monthEnd}`
      );

      // Filter metrics for the month
      const monthMetrics = filteredMetrics.filter(
        (m) => m.metricDate >= monthStart && m.metricDate <= monthEnd
      );

      // Calculate average NPS and CSAT for the month
      const npsMetrics = monthMetrics.filter((m) => m.metricType === "nps");
      const csatMetrics = monthMetrics.filter((m) => m.metricType === "csat");
      const avgNps = npsMetrics.length
        ? npsMetrics.reduce((sum, m) => sum + m.value, 0) / npsMetrics.length
        : 0;
      const avgCsat = csatMetrics.length
        ? csatMetrics.reduce((sum, m) => sum + m.value, 0) / csatMetrics.length
        : 0;
      npsData.push(avgNps);
      csatData.push(avgCsat);

      console.log(
        `Month: ${month}, NPS: ${avgNps}, CSAT: ${avgCsat}, Metrics count: ${monthMetrics.length}`
      );

      // Existing logic for other metrics
      const monthCustomers = filteredCustomers.filter(
        (c) => c.createdAt >= monthStart && c.createdAt <= monthEnd
      );
      const count = monthCustomers.length || 1;
      if (count === 1 && monthCustomers.length === 0) {
        crrData.push(0);
        churnData.push(0);
        conversionData.push(0);
        productAdoptionData.push(0);
        return;
      }

      const churnedCustomers = filteredCancellations.filter(
        (can) =>
          can.cancellationDate &&
          can.cancellationDate >= monthStart &&
          can.cancellationDate <= monthEnd &&
          filteredCustomers.some(
            (c) => c.customerId === can.customerId && c.status === "inactive"
          )
      ).length;
      const churnRate = (churnedCustomers / count) * 100;
      churnData.push(churnRate);
      crrData.push(100 - churnRate);

      const totalFreeCustomersInMonth = filteredCustomers.filter(
        (c) =>
          c.subscriptionTier === "free" &&
          c.createdAt >= monthStart &&
          c.createdAt <= monthEnd
      ).length;
      const upgradedCustomers = filteredUpgrades.filter(
        (u) =>
          u.planUpgradeDate &&
          u.planUpgradeDate >= monthStart &&
          u.planUpgradeDate <= monthEnd &&
          u.subscriptionTier === "premium" &&
          filteredCustomers.some((c) => c.customerId === u.customerId)
      ).length;
      const conversionRate = totalFreeCustomersInMonth
        ? (upgradedCustomers / totalFreeCustomersInMonth) * 100
        : 0;
      conversionData.push(conversionRate);

      productAdoptionData.push(0);
    });

    const churnReasonsCount = {
      Price: 0,
      Service: 0,
      Features: 0,
      Other: 0,
      None: 0,
    };
    filteredCancellations.forEach((c) => {
      const reason = c.churnReason || "None";
      if (churnReasonsCount.hasOwnProperty(reason)) {
        churnReasonsCount[reason]++;
      }
    });
    const totalChurnReasons =
      Object.values(churnReasonsCount).reduce((sum, count) => sum + count, 0) ||
      1;
    const churnReasonData = Object.keys(churnReasonsCount).map((reason) => ({
      reason,
      percentage: (churnReasonsCount[reason] / totalChurnReasons) * 100,
    }));

    const features = ["Core", "Advanced", "Integrations"];
    const productAdoptionByFeature = features.map((feature) => {
      const featureUsers = filteredCustomers.filter(
        (c) => c.feature === feature
      ).length;
      const totalCustomers = filteredCustomers.length || 1;
      return {
        feature,
        rate: (featureUsers / totalCustomers) * 100,
      };
    });

    const issuesByProject = projects
      .map((project) => {
        const ticketCount = filteredSupportTickets.filter((t) =>
          t.projectIds.includes(project.projectId)
        ).length;
        return { project: project.projectId, count: ticketCount };
      })
      .filter((p) => p.count > 0);

    const resolutionStatus = {
      resolved: filteredSupportTickets.filter((t) => t.resolvedDate).length,
      unresolved: filteredSupportTickets.filter((t) => !t.resolvedDate).length,
    };

    const revenueLostData = churnData.map((churn, idx) => {
      const monthStart = startOfMonth(
        parse(months[idx], "MMM yyyy", new Date())
      );
      const monthEnd = endOfMonth(parse(months[idx], "MMM yyyy", new Date()));
      const monthCustomers = filteredCustomers.filter(
        (c) => c.createdAt >= monthStart && c.createdAt <= monthEnd
      );
      const avgCltv = monthCustomers.length
        ? monthCustomers.reduce((sum, c) => sum + (c.cltv || 0), 0) /
          monthCustomers.length
        : 0;
      return (churn / 100) * avgCltv;
    });

    return {
      months,
      npsData,
      csatData,
      crrData,
      churnData,
      conversionData,
      productAdoptionData,
      churnReasonData,
      productAdoptionByFeature,
      issuesByProject,
      resolutionStatus,
      revenueLostData,
      totalFreeCustomers,
      totalPremiumCustomers,
    };
  };

  const {
    months,
    npsData,
    csatData,
    crrData,
    churnData,
    conversionData,
    productAdoptionData,
    churnReasonData,
    productAdoptionByFeature,
    issuesByProject,
    resolutionStatus,
    revenueLostData,
    totalFreeCustomers,
    totalPremiumCustomers,
  } = getChartData();

  const monthOptions = eachMonthOfInterval({
    start: startOfYear(new Date(2025, 0, 1)),
    end: endOfYear(new Date(2025, 11, 31)),
  }).map((date) => ({
    value: format(date, "yyyy-MM"),
    label: format(date, "MMM yyyy"),
  }));

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: darkMode ? "#ffffff" : "#333333",
          font: { size: 12 },
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: darkMode ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)",
        titleColor: darkMode ? "#ffffff" : "#333333",
        bodyColor: darkMode ? "#ffffff" : "#333333",
        borderColor: darkMode ? "#555555" : "#cccccc",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: darkMode ? "#ffffff" : "#333333",
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          display: false,
        },
      },
      y: {
        ticks: { color: darkMode ? "#ffffff" : "#333333" },
        grid: { color: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
        beginAtZero: true,
      },
    },
    interaction: {
      mode: "nearest",
      intersect: false,
      axis: "x",
    },
    layout: {
      padding: { top: 10, bottom: 10, left: 10, right: 10 },
    },
  };

  // Chart-specific options with dynamic y-axis scaling
  const productAdoptionChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        suggestedMax:
          Math.max(...productAdoptionByFeature.map((f) => f.rate)) * 1.1 || 100,
      },
    },
  };

  const issuesByProjectChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        suggestedMax:
          Math.max(...issuesByProject.map((p) => p.count)) * 1.1 || 10,
      },
    },
  };

  const churnReasonChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        suggestedMax:
          Math.max(...churnReasonData.map((r) => r.percentage)) * 1.1 || 100,
      },
    },
  };

  const cohortChurnChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        suggestedMax: Math.max(...churnData) * 1.1 || 100,
      },
    },
  };

  const npsCsatBarData = {
    labels: months,
    datasets: [
      {
        label: "NPS",
        data: npsData,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
      {
        label: "CSAT",
        data: csatData,
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const npsCsatLineData = {
    labels: months,
    datasets: [
      {
        label: "NPS",
        data: npsData,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "CSAT",
        data: csatData,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const retentionChurnData = {
    labels: months,
    datasets: [
      {
        label: "Retention Rate (%)",
        data: crrData,
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        yAxisID: "y",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Churn Rate (%)",
        data: churnData,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        yAxisID: "y1",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const conversionDataChart = {
    labels: months,
    datasets: [
      {
        label: "Conversion Rate (%)",
        data: conversionData,
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const productAdoptionBarData = {
    labels: productAdoptionByFeature.map((f) => f.feature),
    datasets: [
      {
        label: "Adoption Rate (%)",
        data: productAdoptionByFeature.map((f) => f.rate),
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const issuesByProjectData = {
    labels: issuesByProject.map((p) => p.project),
    datasets: [
      {
        label: "Number of Issues",
        data: issuesByProject.map((p) => p.count),
        backgroundColor: "rgba(153, 102, 255, 0.6)",
        borderColor: "rgba(153, 102, 255, 1)",
        borderWidth: 1,
      },
    ],
  };

  const resolutionStatusData = {
    labels: ["Resolved", "Unresolved"],
    datasets: [
      {
        data: [resolutionStatus.resolved, resolutionStatus.unresolved],
        backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const revenueLostLineData = {
    labels: months,
    datasets: [
      {
        label: "Revenue Lost ($)",
        data: revenueLostData,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const churnReasonBarData = {
    labels: churnReasonData.map((r) => r.reason),
    datasets: [
      {
        label: "Churn Reasons (%)",
        data: churnReasonData.map((r) => r.percentage),
        backgroundColor: "rgba(255, 159, 64, 0.6)",
        borderColor: "rgba(255, 159, 64, 1)",
        borderWidth: 1,
      },
    ],
  };

  const cohortChurnData = {
    labels: months,
    datasets: [
      {
        label: "Churn Rate (%)",
        data: churnData,
        backgroundColor: "rgba(255, 159, 64, 0.6)",
        borderColor: "rgba(255, 159, 64, 1)",
        borderWidth: 1,
      },
    ],
  };

  if (loadingRoles || loadingData) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          Loading...
        </MDTypography>
      </Box>
    );
  }

  if (
    !userRoles.includes("ManageCustomer:read") &&
    !userRoles.includes("ManageCustomer:full access")
  ) {
    return <Navigate to="/unauthorized" />;
  }

  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.2 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "background.default" : "#f5f7fa",
        minHeight: "100vh",
        padding: { xs: 2, md: 4 },
      }}
    >
      <DashboardNavbar
        absolute
        light={!darkMode}
        isMini={false}
        sx={{
          backgroundColor: darkMode
            ? "rgba(33, 33, 33, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "64px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          width: {
            xs: "100%",
            md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)",
          },
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      />
      <MDBox
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          marginTop: { xs: "100px", md: "80px" },
          maxWidth: "100%",
          mx: "auto",
        }}
      >
        <MDBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={titleVariants}
          >
            <MDBox
              sx={{ overflow: "hidden", whiteSpace: "nowrap", flexGrow: 1 }}
            >
              <motion.div
                animate={{ x: ["0%", "-100%"] }}
                transition={{
                  x: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 20,
                    ease: "linear",
                  },
                }}
              >
                <MDTypography
                  variant="h3"
                  color={darkMode ? "white" : "textPrimary"}
                  sx={{
                    display: "inline-block",
                    fontWeight: 700,
                    fontFamily: "'Poppins', 'Roboto', sans-serif",
                    letterSpacing: "-0.02em",
                    textShadow: darkMode
                      ? "0 2px 4px rgba(0,0,0,0.3)"
                      : "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  Customer Insights Dashboard
                </MDTypography>
              </motion.div>
            </MDBox>
          </motion.div>
          <Paper
            elevation={2}
            sx={{
              p: 0.5,
              backgroundColor: darkMode ? "#333333" : "#ffffff",
              borderRadius: "12px",
              boxShadow: darkMode
                ? "0 4px 12px rgba(0,0,0,0.4)"
                : "0 4px 12px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: darkMode
                  ? "0 6px 16px rgba(0,0,0,0.5)"
                  : "0 6px 16px rgba(0,0,0,0.15)",
              },
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel
                sx={{
                  color: darkMode ? "#ffffff" : "#333333",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  "&.Mui-focused": { color: darkMode ? "#ffffff" : "#1976d2" },
                }}
              >
                Date Filter
              </InputLabel>
              <Select
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value)}
                label="Date Filter"
                sx={{
                  color: darkMode ? "#ffffff" : "#333333",
                  height: 36,
                  fontSize: "0.9rem",
                  backgroundColor: darkMode ? "#424242" : "#f5f5f5",
                  borderRadius: "8px",
                  "& .MuiSvgIcon-root": {
                    color: darkMode ? "#ffffff" : "#333333",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(0,0,0,0.2)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#ffffff" : "#1976d2",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#4fc3f7" : "#1976d2",
                  },
                }}
              >
                <MenuItem
                  value="all"
                  sx={{
                    color: darkMode ? "#ffffff" : "#333333",
                    backgroundColor: darkMode ? "#424242" : "#ffffff",
                  }}
                >
                  All Dates
                </MenuItem>
                {monthOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    sx={{
                      color: darkMode ? "#ffffff" : "#333333",
                      backgroundColor: darkMode ? "#424242" : "#ffffff",
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
                <MenuItem
                  value="custom"
                  sx={{
                    color: darkMode ? "#ffffff" : "#333333",
                    backgroundColor: darkMode ? "#424242" : "#ffffff",
                  }}
                >
                  Custom Range
                </MenuItem>
              </Select>
            </FormControl>
            {dateFilterType === "custom" && (
              <Button
                variant="contained"
                onClick={() => setDatePickerOpen(true)}
                sx={{
                  background: darkMode
                    ? "linear-gradient(45deg, #2e7d32 30%, #66bb6a 90%)"
                    : "linear-gradient(45deg, #388e3c 30%, #81c784 90%)",
                  color: "#ffffff",
                  borderRadius: "8px",
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  px: 1.5,
                  py: 0.4,
                  "&:hover": {
                    background: darkMode
                      ? "linear-gradient(45deg, #1b5e20 30%, #4caf50 90%)"
                      : "linear-gradient(45deg, #2e7d32 30%, #66bb6a 90%)",
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Select Dates
              </Button>
            )}
            <Dialog
              open={datePickerOpen}
              onClose={() => setDatePickerOpen(false)}
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "#2a2a2a" : "white",
                  borderRadius: "16px",
                  boxShadow: darkMode
                    ? "0 8px 24px rgba(0,0,0,0.5)"
                    : "0 8px 24px rgba(0,0,0,0.2)",
                  width: "350px",
                  border: darkMode
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(0,0,0,0.1)",
                },
              }}
            >
              <DialogTitle
                sx={{
                  color: darkMode ? "#ffffff" : "#333333",
                  fontWeight: 600,
                  background: darkMode
                    ? "linear-gradient(135deg, #333 0%, #424242 100%)"
                    : "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
                  borderRadius: "16px 16px 0 0",
                  py: 2,
                  textAlign: "center",
                  fontSize: "1.2rem",
                  letterSpacing: "0.02em",
                }}
              >
                Select Date Range
              </DialogTitle>
              <DialogContent
                sx={{
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  background: darkMode ? "#2a2a2a" : "white",
                  borderTop: darkMode
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <TextField
                  label="Start Date"
                  type="date"
                  value={
                    customStartDate
                      ? customStartDate.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => setCustomStartDate(new Date(e.target.value))}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    input: {
                      color: darkMode ? "#ffffff" : "#333333",
                      backgroundColor: darkMode ? "#424242" : "#f5f5f5",
                      borderRadius: "8px",
                      padding: "8px 12px",
                    },
                    "& .MuiInputLabel-root": {
                      color: darkMode ? "#ffffff" : "#333333",
                      fontWeight: 500,
                      fontSize: "0.9rem",
                      transform: "translate(14px, -6px) scale(0.75)",
                      backgroundColor: darkMode ? "#2a2a2a" : "white",
                      padding: "0 4px",
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: darkMode
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                      },
                      "&:hover fieldset": {
                        borderColor: darkMode ? "#ffffff" : "#1976d2",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: darkMode ? "#4fc3f7" : "#1976d2",
                      },
                    },
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={
                    customEndDate
                      ? customEndDate.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => setCustomEndDate(new Date(e.target.value))}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    input: {
                      color: darkMode ? "#ffffff" : "#333333",
                      backgroundColor: darkMode ? "#424242" : "#f5f5f5",
                      borderRadius: "8px",
                      padding: "8px 12px",
                    },
                    "& .MuiInputLabel-root": {
                      color: darkMode ? "#ffffff" : "#333333",
                      fontWeight: 500,
                      fontSize: "0.9rem",
                      transform: "translate(14px, -6px) scale(0.75)",
                      backgroundColor: darkMode ? "#2a2a2a" : "white",
                      padding: "0 4px",
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: darkMode
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                      },
                      "&:hover fieldset": {
                        borderColor: darkMode ? "#ffffff" : "#1976d2",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: darkMode ? "#4fc3f7" : "#1976d2",
                      },
                    },
                  }}
                />
              </DialogContent>
              <DialogActions
                sx={{
                  background: darkMode
                    ? "linear-gradient(135deg, #333 0%, #424242 100%)"
                    : "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
                  borderTop: darkMode
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(0,0,0,0.05)",
                  borderRadius: "0 0 16px 16px",
                  py: 1.5,
                  px: 3,
                }}
              >
                <Button
                  onClick={() => setDatePickerOpen(false)}
                  sx={{
                    color: "#ffffff",
                    textTransform: "none",
                    fontWeight: 500,
                    borderRadius: "8px",
                    px: 3,
                    py: 0.5,
                    background: darkMode
                      ? "linear-gradient(45deg, #d32f2f 30%, #f44336 90%)"
                      : "linear-gradient(45deg, #e53935 30%, #ef5350 90%)",
                    "&:hover": {
                      background: darkMode
                        ? "linear-gradient(45deg, #b71c1c 30%, #d32f2f 90%)"
                        : "linear-gradient(45deg, #d32f2f 30%, #f44336 90%)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setDatePickerOpen(false)}
                  sx={{
                    background: darkMode
                      ? "linear-gradient(45deg, #0288d1 30%, #4fc3f7 90%)"
                      : "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
                    color: "#ffffff",
                    textTransform: "none",
                    fontWeight: 500,
                    borderRadius: "8px",
                    px: 3,
                    py: 0.5,
                    "&:hover": {
                      background: darkMode
                        ? "linear-gradient(45deg, #0277bd 30%, #29b6f6 90%)"
                        : "linear-gradient(45deg, #1565c0 30%, #2196f3 90%)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  Apply
                </Button>
              </DialogActions>
            </Dialog>
          </Paper>
        </MDBox>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 1,
                backgroundColor: darkMode ? "#2a2a2a" : "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <MDTypography
                variant="subtitle2"
                color={darkMode ? "#ffffff" : "textPrimary"}
                sx={{ mb: 0.5, fontSize: "0.9rem" }}
              >
                Filter by Project IDs
              </MDTypography>
              <Paper
                sx={{
                  p: 1,
                  backgroundColor: darkMode ? "#333333" : "#fff",
                  borderRadius: "6px",
                  maxHeight: "80px",
                  overflowX: "auto",
                  overflowY: "hidden",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                <Stack direction="row" spacing={1}>
                  {projects.map((project) => (
                    <Chip
                      key={project.projectId}
                      label={`${project.projectId} - ${project.name}`}
                      onClick={() => {
                        setSelectedProjectIds((prev) =>
                          prev.includes(project.projectId)
                            ? prev.filter((id) => id !== project.projectId)
                            : [...prev, project.projectId]
                        );
                      }}
                      color={
                        selectedProjectIds.includes(project.projectId)
                          ? "primary"
                          : "default"
                      }
                      sx={{
                        m: 0.3,
                        backgroundColor:
                          darkMode &&
                          !selectedProjectIds.includes(project.projectId)
                            ? "#555555"
                            : undefined,
                        color: darkMode ? "#ffffff" : undefined,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
              {selectedProjectIds.length > 0 && (
                <MDBox mt={1}>
                  <Tooltip
                    title={
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {selectedProjectIds.map((id) => (
                          <Chip
                            key={id}
                            label={
                              projects.find((p) => p.projectId === id)?.name ||
                              id
                            }
                            onDelete={() =>
                              setSelectedProjectIds((prev) =>
                                prev.filter((pid) => pid !== id)
                              )
                            }
                            color="primary"
                            sx={{
                              m: 0.3,
                              color: darkMode ? "#ffffff" : undefined,
                            }}
                          />
                        ))}
                      </Stack>
                    }
                    placement="top"
                    sx={{
                      backgroundColor: darkMode ? "#424242" : "#ffffff",
                      color: darkMode ? "#ffffff" : "#333333",
                    }}
                  >
                    <MDTypography
                      variant="body2"
                      color={darkMode ? "#ffffff" : "textPrimary"}
                      sx={{ fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      {selectedProjectIds.length} Project
                      {selectedProjectIds.length > 1 ? "s" : ""} Selected
                    </MDTypography>
                  </Tooltip>
                </MDBox>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
            >
              <Paper
                elevation={3}
                sx={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: darkMode
                    ? "linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
              >
                <MDBox
                  px={3}
                  py={2}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ background: darkMode ? "#333" : "#e3f2fd" }}
                >
                  <MDTypography
                    variant="h6"
                    color={darkMode ? "white" : "textPrimary"}
                    fontWeight="medium"
                  >
                    Customer Satisfaction & Retention
                  </MDTypography>
                  <Tooltip title="Refresh Data">
                    <IconButton onClick={fetchData}>
                      <RefreshIcon
                        sx={{ color: darkMode ? "#fff" : "#1976d2" }}
                      />
                    </IconButton>
                  </Tooltip>
                </MDBox>
                <Divider />
                <MDBox p={3}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "300px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            NPS & CSAT Trends (Bar)
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="bar"
                              data={npsCsatBarData}
                              options={chartOptions}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "300px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            NPS & CSAT Trends (Line)
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="line"
                              data={npsCsatLineData}
                              options={chartOptions}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "250px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            Retention vs. Churn Rate
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="line"
                              data={retentionChurnData}
                              options={{
                                ...chartOptions,
                                scales: {
                                  x: {
                                    ticks: {
                                      color: darkMode ? "#ffffff" : "#333333",
                                    },
                                  },
                                  y: {
                                    ticks: {
                                      color: darkMode ? "#ffffff" : "#333333",
                                    },
                                    title: {
                                      display: true,
                                      text: "Retention Rate (%)",
                                      color: darkMode ? "#ffffff" : "#333333",
                                    },
                                  },
                                  y1: {
                                    ticks: {
                                      color: darkMode ? "#ffffff" : "#333333",
                                    },
                                    title: {
                                      display: true,
                                      text: "Churn Rate (%)",
                                      color: darkMode ? "#ffffff" : "#333333",
                                    },
                                    position: "right",
                                  },
                                },
                              }}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "250px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            Conversion Rate
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="line"
                              data={conversionDataChart}
                              options={chartOptions}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "250px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            Product Adoption Rates
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="bar"
                              data={productAdoptionBarData}
                              options={productAdoptionChartOptions}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <MDBox
                        sx={{
                          backgroundColor: darkMode ? "#424242" : "#e3f2fd",
                          borderRadius: "8px",
                          p: 2,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      >
                        <MDTypography
                          variant="h6"
                          color={darkMode ? "white" : "textPrimary"}
                          fontWeight="medium"
                          mb={1}
                        >
                          Account Summary
                        </MDTypography>
                        <MDTypography
                          variant="body1"
                          color={darkMode ? "white" : "textPrimary"}
                          fontWeight="bold"
                        >
                          Free Accounts: {totalFreeCustomers}
                        </MDTypography>
                        <MDTypography
                          variant="body1"
                          color={darkMode ? "white" : "textPrimary"}
                          fontWeight="bold"
                        >
                          Premium Accounts: {totalPremiumCustomers}
                        </MDTypography>
                      </MDBox>
                    </Grid>
                  </Grid>
                </MDBox>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12}>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
            >
              <Paper
                elevation={3}
                sx={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: darkMode
                    ? "linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
              >
                <MDBox
                  px={3}
                  py={2}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ background: darkMode ? "#333" : "#e3f2fd" }}
                >
                  <MDTypography
                    variant="h6"
                    color={darkMode ? "white" : "textPrimary"}
                    fontWeight="medium"
                  >
                    Support Performance
                  </MDTypography>
                  <Tooltip title="Refresh Data">
                    <IconButton onClick={fetchData}>
                      <RefreshIcon
                        sx={{ color: darkMode ? "#fff" : "#1976d2" }}
                      />
                    </IconButton>
                  </Tooltip>
                </MDBox>
                <Divider />
                <MDBox p={3}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "300px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            Issues by Project
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="bar"
                              data={issuesByProjectData}
                              options={issuesByProjectChartOptions}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "300px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            Resolution Status
                          </MDTypography>
                          <Box
                            sx={{
                              height: "calc(100% - 40px)",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Chart
                              type="pie"
                              data={resolutionStatusData}
                              options={{ ...chartOptions, aspectRatio: 1 }}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                  </Grid>
                </MDBox>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12}>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
            >
              <Paper
                elevation={3}
                sx={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: darkMode
                    ? "linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
              >
                <MDBox
                  px={3}
                  py={2}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ background: darkMode ? "#333" : "#e3f2fd" }}
                >
                  <MDTypography
                    variant="h6"
                    color={darkMode ? "white" : "textPrimary"}
                    fontWeight="medium"
                  >
                    Churn Analysis
                  </MDTypography>
                  <Tooltip title="Refresh Data">
                    <IconButton onClick={fetchData}>
                      <RefreshIcon
                        sx={{ color: darkMode ? "#fff" : "#1976d2" }}
                      />
                    </IconButton>
                  </Tooltip>
                </MDBox>
                <Divider />
                <MDBox p={3}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "300px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            Cohort Churn Rate
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="bar"
                              data={cohortChurnData}
                              options={cohortChurnChartOptions}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "300px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            Revenue Lost to Churn
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="line"
                              data={revenueLostLineData}
                              options={chartOptions}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <motion.div variants={cardVariants}>
                        <Card
                          sx={{
                            borderRadius: "12px",
                            p: 2,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            height: "300px",
                            overflow: "hidden",
                          }}
                        >
                          <MDTypography
                            variant="h6"
                            color={darkMode ? "white" : "textPrimary"}
                            mb={2}
                          >
                            Churn Reasons
                          </MDTypography>
                          <Box sx={{ height: "calc(100% - 40px)" }}>
                            <Chart
                              type="bar"
                              data={churnReasonBarData}
                              options={churnReasonChartOptions}
                            />
                          </Box>
                        </Card>
                      </motion.div>
                    </Grid>
                  </Grid>
                </MDBox>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </MDBox>
      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          backgroundColor: darkMode ? "background.default" : "#f5f7fa",
          zIndex: 1100,
          py: 4,
        }}
      >
        <Footer />
      </Box>
    </Box>
  );
};

export default CustomerDashboard;

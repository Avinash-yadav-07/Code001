import React, { useState, useEffect, useMemo, memo } from "react";
import PropTypes from "prop-types";
import {
  Grid,
  Paper,
  Box,
  Card,
  List,
  ListItem,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { db } from "../manage-employee/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { format, subMonths } from "date-fns";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import { motion } from "framer-motion";
import debounce from "lodash/debounce";

// Register Chart.js components
ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  ChartTooltip,
  Legend
);

// Memoized Filter Controls Component
const FilterControls = memo(
  ({ dateRange, setDateRange, selectedTeam, setSelectedTeam, teams, darkMode }) => (
    <MDBox
      mt={2}
      sx={{
        background: darkMode ? "rgba(50,50,50,0.9)" : "rgba(255,255,255,0.9)",
        p: 2,
        borderRadius: "8px",
      }}
    >
      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs={12} sm={4} md={3}>
          <TextField
            label="Start Date"
            type="date"
            value={format(dateRange.start, "yyyy-MM-dd")}
            onChange={(e) => {
              const newStart = new Date(e.target.value);
              if (newStart <= dateRange.end) {
                setDateRange((prev) => ({ ...prev, start: newStart }));
              }
            }}
            fullWidth
            InputLabelProps={{ shrink: true }}
            sx={{
              "& .MuiInputBase-input": { color: darkMode ? "#fff" : "#333" },
              "& .MuiInputLabel-root": { color: darkMode ? "#aaa" : "#666" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: darkMode ? "#555" : "#ccc" },
                "&:hover fieldset": { borderColor: darkMode ? "#777" : "#999" },
              },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <TextField
            label="End Date"
            type="date"
            value={format(dateRange.end, "yyyy-MM-dd")}
            onChange={(e) => {
              const newEnd = new Date(e.target.value);
              if (newEnd >= dateRange.start) {
                setDateRange((prev) => ({ ...prev, end: newEnd }));
              }
            }}
            fullWidth
            InputLabelProps={{ shrink: true }}
            sx={{
              "& .MuiInputBase-input": { color: darkMode ? "#fff" : "#333" },
              "& .MuiInputLabel-root": { color: darkMode ? "#aaa" : "#666" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: darkMode ? "#555" : "#ccc" },
                "&:hover fieldset": { borderColor: darkMode ? "#777" : "#999" },
              },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <FormControl fullWidth sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: darkMode ? "#aaa" : "#666" }}>Team</InputLabel>
            <Select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              label="Team"
              sx={{
                color: darkMode ? "#fff" : "#333",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode ? "#555" : "#ccc",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode ? "#777" : "#999",
                },
                "& .MuiSvgIcon-root": { color: darkMode ? "#aaa" : "#666" },
              }}
            >
              <MenuItem value="All">All Teams</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.teamName}>
                  {team.teamName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </MDBox>
  )
);

// Chart options defined outside component
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
      labels: {
        font: { size: 12 },
        padding: 10,
      },
    },
    tooltip: {
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { maxRotation: 45, minRotation: 45 },
      grid: { display: false },
    },
    y: {
      grid: {},
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

// Animation variants defined outside component
const titleVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const DashboardPage = () => {
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [deals, setDeals] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: subMonths(new Date(), 6), end: new Date() });
  const [selectedTeam, setSelectedTeam] = useState("All");
  const [viewMode, setViewMode] = useState("Marketing");
  const [showFilters, setShowFilters] = useState(false);

  // Debounced fetchData to prevent rapid Firestore queries
  const fetchData = useMemo(
    () =>
      debounce(async () => {
        setLoading(true);
        setError(null);
        try {
          // Convert dateRange to Firestore Timestamps
          const startTimestamp = Timestamp.fromDate(dateRange.start);
          const endTimestamp = Timestamp.fromDate(dateRange.end);

          const leadsQuery = query(
            collection(db, "leads"),
            where("createdAt", ">=", startTimestamp),
            where("createdAt", "<=", endTimestamp)
          );
          const campaignsQuery = query(
            collection(db, "campaigns"),
            where("createdAt", ">=", startTimestamp),
            where("createdAt", "<=", endTimestamp)
          );
          const dealsQuery = query(
            collection(db, "deals"),
            where("dateEntered", ">=", format(dateRange.start, "yyyy-MM-dd")),
            where("dateEntered", "<=", format(dateRange.end, "yyyy-MM-dd"))
          );
          const teamsQuery = collection(db, "teams");

          const [leadsSnapshot, campaignsSnapshot, dealsSnapshot, teamsSnapshot] =
            await Promise.all([
              getDocs(leadsQuery).catch(() => ({ docs: [] })),
              getDocs(campaignsQuery).catch(() => ({ docs: [] })),
              getDocs(dealsQuery).catch(() => ({ docs: [] })),
              getDocs(teamsQuery).catch(() => ({ docs: [] })),
            ]);

          const fetchedLeads = leadsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
          }));
          const fetchedCampaigns = campaignsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
          }));
          const fetchedDeals = dealsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          const fetchedTeams = teamsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

          const filteredLeads =
            selectedTeam !== "All"
              ? fetchedLeads.filter((lead) => lead.team === selectedTeam)
              : fetchedLeads;
          const filteredCampaigns =
            selectedTeam !== "All"
              ? fetchedCampaigns.filter((campaign) => campaign.team === selectedTeam)
              : fetchedCampaigns;
          const filteredDeals =
            selectedTeam !== "All"
              ? fetchedDeals.filter((deal) => deal.team === selectedTeam)
              : fetchedDeals;

          setLeads(filteredLeads);
          setCampaigns(filteredCampaigns);
          setDeals(filteredDeals);
          setTeams(fetchedTeams);
        } catch (err) {
          console.error("Error fetching data:", err);
          setError("Failed to load dashboard data. Please try again.");
        } finally {
          setLoading(false);
        }
      }, 300),
    [dateRange, selectedTeam]
  );

  // Fetch projects from Firestore
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const projectsSnapshot = await getDocs(collection(db, "projects"));
        const projectsData = projectsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unnamed Project",
        }));
        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setError("Failed to fetch projects");
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch accounts from Firestore
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const accountsSnapshot = await getDocs(collection(db, "accounts"));
        const accountsData = accountsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unnamed Account",
        }));
        setAccounts(accountsData);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        setError("Failed to fetch accounts");
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchData();
    return () => fetchData.cancel(); // Cleanup debounce on unmount
  }, [fetchData]);

  // Memoized data processing for Marketing view (unchanged)
  const mqls = useMemo(
    () => leads.reduce((sum, lead) => sum + (Number(lead.marketingQualifiedLeads) || 0), 0),
    [leads]
  );
  const sqls = useMemo(
    () => leads.reduce((sum, lead) => sum + (Number(lead.salesQualifiedLeads) || 0), 0),
    [leads]
  );
  const conversions = useMemo(
    () => leads.reduce((sum, lead) => sum + (Number(lead.conversions) || 0), 0),
    [leads]
  );
  const funnelData = useMemo(
    () => ({
      labels: ["MQLs", "SQLs", "Conversions"],
      datasets: [
        {
          label: "Lead Funnel",
          data: [mqls, sqls, conversions],
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
        },
      ],
    }),
    [mqls, sqls, conversions]
  );

  const channels = useMemo(
    () => [...new Set(leads.map((lead) => lead.channel || "Unknown"))],
    [leads]
  );
  const cplData = useMemo(
    () => ({
      labels: channels.length > 0 ? channels : ["No Data"],
      datasets: [
        {
          label: "CPL ($)",
          data:
            channels.length > 0
              ? channels.map((channel) => {
                  const channelLeads = leads.filter((lead) => lead.channel === channel);
                  const totalSpend = channelLeads.reduce(
                    (sum, lead) => sum + (Number(lead.spend) || 0),
                    0
                  );
                  const totalLeads = channelLeads.reduce(
                    (sum, lead) => sum + (Number(lead.leads) || 0),
                    0
                  );
                  return totalLeads > 0 ? totalSpend / totalLeads : 0;
                })
              : [0],
          backgroundColor: "#42A5F5",
        },
      ],
    }),
    [channels, leads]
  );

  const conversionHeatmapData = useMemo(
    () => ({
      labels: channels.length > 0 ? channels : ["No Data"],
      datasets: [
        {
          label: "Conversion Rate (%)",
          data:
            channels.length > 0
              ? channels.map((channel) => {
                  const channelLeads = leads.filter((lead) => lead.channel === channel);
                  const totalLeads = channelLeads.reduce(
                    (sum, lead) => sum + (Number(lead.leads) || 0),
                    0
                  );
                  const totalConversions = channelLeads.reduce(
                    (sum, lead) => sum + (Number(lead.conversions) || 0),
                    0
                  );
                  return totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;
                })
              : [0],
          backgroundColor: "#66BB6A",
        },
      ],
    }),
    [channels, leads]
  );

  const roiData = useMemo(
    () => ({
      labels: campaigns.length > 0 ? campaigns.map((c) => c.name || "Unnamed") : ["No Data"],
      datasets: [
        {
          label: "ROI (%)",
          data:
            campaigns.length > 0
              ? campaigns.map((campaign) => {
                  const cost = Number(campaign.cost) || 0;
                  const revenue = Number(campaign.revenue) || 0;
                  return cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
                })
              : [0],
          backgroundColor: "#FFA726",
        },
      ],
    }),
    [campaigns]
  );

  const campaignTypes = useMemo(
    () => [...new Set(campaigns.map((c) => c.type || "Unknown"))],
    [campaigns]
  );
  const engagementData = useMemo(
    () => ({
      labels: campaignTypes.length > 0 ? campaignTypes : ["No Data"],
      datasets: [
        {
          label: "Average CTR (%)",
          data:
            campaignTypes.length > 0
              ? campaignTypes.map((type) => {
                  const typeCampaigns = campaigns.filter((c) => c.type === type);
                  const totalCTR = typeCampaigns.reduce(
                    (sum, c) => sum + (Number(c.clickThroughRate) || 0),
                    0
                  );
                  return typeCampaigns.length > 0 ? totalCTR / typeCampaigns.length : 0;
                })
              : [0],
          backgroundColor: "#AB47BC",
        },
      ],
    }),
    [campaignTypes, campaigns]
  );

  const topCampaigns = useMemo(
    () =>
      campaigns.length > 0
        ? [...campaigns]
            .sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0))
            .slice(0, 5)
        : [],
    [campaigns]
  );

  // Memoized data processing for Sales view (aligned with ManageSales)
  const stages = ["Lead", "Negotiation", "Closed Won", "Closed Lost"];
  const pipelineData = useMemo(
    () => ({
      labels: stages,
      datasets: [
        {
          label: "Deals by Stage",
          data: stages.map((stage) => deals.filter((deal) => deal.stage === stage).length),
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
        },
      ],
    }),
    [deals]
  );

  const totalLeads = useMemo(() => deals.filter((deal) => deal.stage === "Lead").length, [deals]);
  const closedWon = useMemo(() => deals.filter((deal) => deal.outcome === "Won").length, [deals]);
  const conversionRate = useMemo(
    () => (totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0),
    [totalLeads, closedWon]
  );

  const avgDealSizeData = useMemo(
    () => ({
      labels: stages,
      datasets: [
        {
          label: "Average Deal Size ($)",
          data: stages.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            const totalValue = stageDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
            return stageDeals.length > 0 ? totalValue / stageDeals.length : 0;
          }),
          backgroundColor: "#42A5F5",
        },
      ],
    }),
    [deals]
  );

  const teamRevenue = useMemo(
    () =>
      teams.map((team) => {
        const teamDeals = deals.filter(
          (deal) => deal.team === team.teamName && deal.outcome === "Won"
        );
        const revenue = teamDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
        return { team: team.teamName || "Unknown", revenue, quota: Number(team.quota) || 0 };
      }),
    [teams, deals]
  );

  const revenueVsQuotaData = useMemo(
    () => ({
      labels: teamRevenue.length > 0 ? teamRevenue.map((t) => t.team) : ["No Data"],
      datasets: [
        {
          label: "Revenue ($)",
          data: teamRevenue.length > 0 ? teamRevenue.map((t) => t.revenue) : [0],
          backgroundColor: "#66BB6A",
        },
        {
          label: "Quota ($)",
          data: teamRevenue.length > 0 ? teamRevenue.map((t) => t.quota) : [0],
          backgroundColor: "#FFA726",
        },
      ],
    }),
    [teamRevenue]
  );

  const salesCycleData = useMemo(
    () =>
      viewMode === "Sales"
        ? {
            labels: teamRevenue.length > 0 ? teamRevenue.map((t) => t.team) : ["No Data"],
            datasets: [
              {
                label: "Avg Cycle (days)",
                data:
                  teamRevenue.length > 0
                    ? teamRevenue.map((t) => {
                        const teamDeals = deals.filter(
                          (deal) => deal.team === t.team && deal.outcome === "Won"
                        );
                        const cycleLengths = teamDeals.map((deal) => {
                          const entered = new Date(deal.dateEntered);
                          const closed = deal.dateClosed ? new Date(deal.dateClosed) : new Date();
                          return (closed - entered) / (1000 * 60 * 60 * 24);
                        });
                        return cycleLengths.length > 0
                          ? cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length
                          : 0;
                      })
                    : [0],
                backgroundColor: "#AB47BC",
              },
            ],
          }
        : { labels: [], datasets: [] },
    [teamRevenue, deals, viewMode]
  );

  const winRateData = useMemo(
    () =>
      viewMode === "Sales"
        ? {
            labels: teamRevenue.length > 0 ? teamRevenue.map((t) => t.team) : ["No Data"],
            datasets: [
              {
                label: "Win Rate (%)",
                data:
                  teamRevenue.length > 0
                    ? teamRevenue.map((t) => {
                        const teamDeals = deals.filter((deal) => deal.team === t.team);
                        const won = teamDeals.filter((deal) => deal.outcome === "Won").length;
                        const total = teamDeals.length;
                        return total > 0 ? (won / total) * 100 : 0;
                      })
                    : [0],
                borderColor: "#FFA726",
                backgroundColor: "rgba(255, 167, 38, 0.2)",
                fill: true,
              },
            ],
          }
        : { labels: [], datasets: [] },
    [teamRevenue, deals, viewMode]
  );

  if (loading || loadingProjects || loadingAccounts) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          Loading Dashboard...
        </MDTypography>
      </Box>
    );
  }

  if (error) {
    return (
      <MDBox p={3} textAlign="center">
        <MDTypography color="error" variant="h6">
          {error}
        </MDTypography>
        <MDBox mt={2}>
          <MDTypography variant="body2">
            Please check your Firestore configuration or try refreshing.
          </MDTypography>
          <IconButton onClick={fetchData} sx={{ mt: 1 }}>
            <RefreshIcon sx={{ color: darkMode ? "#fff" : "#1976d2" }} />
          </IconButton>
        </MDBox>
      </MDBox>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "background.default" : "#f5f7fa",
        minHeight: "100vh",
        padding: { xs: 2, md: 4 },
      }}
    >
      <style>
        {`
          :focus {
            outline: 0;
            border-color: #2260ff;
            box-shadow: 0 0 0 4px #b5c9fc;
          }
          .mydict div {
            display: flex;
            flex-wrap: wrap;
            margin-top: 0.5rem;
          }
          .mydict input[type="radio"] {
            clip: rect(0 0 0 0);
            clip-path: inset(100%);
            height: 1px;
            overflow: hidden;
            position: absolute;
            white-space: nowrap;
            width: 1px;
          }
          .mydict input[type="radio"]:checked + span {
            box-shadow: 0 0 0 0.0625em #0043ed;
            background-color: #dee7ff;
            z-index: 1;
            color: #0043ed;
          }
          label span {
            display: block;
            cursor: pointer;
            background-color: #fff;
            padding: 0.375em .75em;
            position: relative;
            margin-left: .0625em;
            box-shadow: 0 0 0 0.0625em #b5bfd9;
            letter-spacing: .05em;
            color: #3e4963;
            text-align: center;
            transition: background-color .5s ease;
          }
          label:first-child span {
            border-radius: .375em 0 0 .375em;
          }
          label:last-child span {
            border-radius: 0 .375em .375em 0;
          }
        `}
      </style>
      <DashboardNavbar
        absolute
        light={!darkMode}
        isMini={false}
        sx={{
          backgroundColor: darkMode ? "rgba(33, 33, 33, 0.95)" : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "64px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)" },
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      />
      <MDBox
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          marginTop: { xs: "100px", md: "80px" },
          maxWidth: "1600px",
          mx: "auto",
        }}
      >
        <motion.div initial="hidden" animate="visible" variants={titleVariants}>
          <MDTypography
            variant="h3"
            color={darkMode ? "white" : "textPrimary"}
            sx={{
              mb: 4,
              fontWeight: 700,
              textAlign: "center",
              fontFamily: "'Poppins', 'Roboto', sans-serif",
              letterSpacing: "-0.02em",
              textShadow: darkMode ? "0 2px 4px rgba(0,0,0,0.3)" : "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            Marketing & Sales Dashboard
          </MDTypography>
        </motion.div>

        {/* Radio Buttons and Settings Button */}
        <motion.div initial="hidden" animate="visible" variants={sectionVariants}>
          <MDBox mb={3} display="flex" alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Box className="mydict" sx={{ mr: 1, py: 1, px: 1, transform: "scale(0.85)" }}>
              <div>
                <label>
                  <input
                    type="radio"
                    name="viewMode"
                    checked={viewMode === "Marketing"}
                    onChange={() => setViewMode("Marketing")}
                  />
                  <span>Marketing</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="viewMode"
                    checked={viewMode === "Sales"}
                    onChange={() => setViewMode("Sales")}
                  />
                  <span>Sales</span>
                </label>
              </div>
            </Box>
            <Button
              startIcon={<SettingsIcon />}
              onClick={() => setShowFilters((prev) => !prev)}
              sx={{
                backgroundColor: darkMode ? "#555" : "#1976d2",
                color: "#fff",
                "&:hover": { backgroundColor: darkMode ? "#777" : "#1565c0" },
                textTransform: "none",
                borderRadius: "8px",
                px: 1,
                py: 1,
              }}
            ></Button>
          </MDBox>
          {showFilters && (
            <FilterControls
              dateRange={dateRange}
              setDateRange={setDateRange}
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              teams={teams}
              darkMode={darkMode}
            />
          )}
        </motion.div>

        <Grid container spacing={3}>
          {/* A. Lead Generation Funnel (Unchanged) */}
          {viewMode === "Marketing" && (
            <Grid item xs={12}>
              <motion.div initial="hidden" animate="visible" variants={sectionVariants}>
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
                      Lead Generation
                    </MDTypography>
                    <Tooltip title="Refresh Data">
                      <IconButton onClick={fetchData}>
                        <RefreshIcon sx={{ color: darkMode ? "#fff" : "#1976d2" }} />
                      </IconButton>
                    </Tooltip>
                  </MDBox>
                  <Divider />
                  <MDBox p={3}>
                    {leads.length === 0 ? (
                      <MDTypography>No lead data available</MDTypography>
                    ) : (
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
                                Lead Funnel
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={funnelData}
                                  options={{
                                    ...chartOptions,
                                    indexAxis: "y",
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
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
                                CPL by Channel
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={cplData}
                                  options={{
                                    ...chartOptions,
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
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
                                Conversion Rates by Source
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={conversionHeatmapData}
                                  options={{
                                    ...chartOptions,
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
                                />
                              </Box>
                            </Card>
                          </motion.div>
                        </Grid>
                      </Grid>
                    )}
                  </MDBox>
                </Paper>
              </motion.div>
            </Grid>
          )}

          {/* B. Marketing Campaign Performance (Unchanged) */}
          {viewMode === "Marketing" && (
            <Grid item xs={12}>
              <motion.div initial="hidden" animate="visible" variants={sectionVariants}>
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
                      Campaign Performance
                    </MDTypography>
                    <Tooltip title="Refresh Data">
                      <IconButton onClick={fetchData}>
                        <RefreshIcon sx={{ color: darkMode ? "#fff" : "#1976d2" }} />
                      </IconButton>
                    </Tooltip>
                  </MDBox>
                  <Divider />
                  <MDBox p={3}>
                    {campaigns.length === 0 ? (
                      <MDTypography>No campaign data available</MDTypography>
                    ) : (
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
                                ROI by Campaign
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={roiData}
                                  options={{
                                    ...chartOptions,
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
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
                                Engagement by Campaign Type
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={engagementData}
                                  options={{
                                    ...chartOptions,
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
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
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                height: "320px",
                                overflow: "auto", // Enable scrolling for many campaigns
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <Box
                                sx={{
                                  padding: (theme) => theme.spacing(2),
                                  borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                }}
                              >
                                <MDTypography
                                  variant="h6"
                                  color="text.primary"
                                  fontWeight="medium"
                                  gutterBottom
                                >
                                  Top Performing Campaigns
                                </MDTypography>
                              </Box>
                              <List sx={{ padding: 1 }}>
                                {topCampaigns.map((campaign) => (
                                  <ListItem
                                    key={campaign.id}
                                    sx={{
                                      padding: (theme) => theme.spacing(1.5, 2),
                                      borderRadius: "8px",
                                      marginBottom: "8px",
                                      backgroundColor: (theme) => theme.palette.background.default,
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                    }}
                                  >
                                    <Box sx={{ width: "35%" }}>
                                      <MDTypography
                                        variant="subtitle2"
                                        fontWeight="medium"
                                        color="text.primary"
                                        noWrap
                                        sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                                      >
                                        {campaign.name || "Unnamed"}
                                      </MDTypography>
                                    </Box>
                                    <Box sx={{ width: "15%", textAlign: "right" }}>
                                      <MDTypography
                                        variant="body2"
                                        color="success.main"
                                        fontWeight="bold"
                                      >
                                        ${Number(campaign.revenue)?.toLocaleString() || "0"}
                                      </MDTypography>
                                    </Box>
                                    <Box sx={{ width: "25%", marginLeft: 2 }}>
                                      <MDTypography
                                        variant="body2"
                                        color="text.secondary"
                                        noWrap
                                        sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                                      >
                                        Project: {campaign.project || "N/A"}
                                      </MDTypography>
                                    </Box>
                                    <Box sx={{ width: "25%", marginLeft: 2 }}>
                                      <MDTypography
                                        variant="body2"
                                        color="text.secondary"
                                        noWrap
                                        sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                                      >
                                        Account: {campaign.account || "N/A"}
                                      </MDTypography>
                                    </Box>
                                  </ListItem>
                                ))}
                                {topCampaigns.length === 0 && (
                                  <ListItem
                                    sx={{ textAlign: "center", py: 2, color: "text.secondary" }}
                                  >
                                    No top campaigns available.
                                  </ListItem>
                                )}
                              </List>
                            </Card>
                          </motion.div>
                        </Grid>
                      </Grid>
                    )}
                  </MDBox>
                </Paper>
              </motion.div>
            </Grid>
          )}

          {/* C. Sales Pipeline Overview (Aligned with ManageSales) */}
          {viewMode === "Sales" && (
            <Grid item xs={12}>
              <motion.div initial="hidden" animate="visible" variants={sectionVariants}>
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
                      Sales Pipeline
                    </MDTypography>
                    <Tooltip title="Refresh Data">
                      <IconButton onClick={fetchData}>
                        <RefreshIcon sx={{ color: darkMode ? "#fff" : "#1976d2" }} />
                      </IconButton>
                    </Tooltip>
                  </MDBox>
                  <Divider />
                  <MDBox p={3}>
                    {deals.length === 0 ? (
                      <MDTypography>No deal data available</MDTypography>
                    ) : (
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <motion.div variants={cardVariants}>
                            <Card
                              sx={{
                                background: darkMode
                                  ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                                  : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                                borderRadius: "12px",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                padding: "20px",
                                transition: "0.3s ease-in-out",
                                "&:hover": {
                                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                                  transform: "scale(1.02)",
                                },
                                height: "300px",
                                overflow: "hidden",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                color={darkMode ? "white" : "textPrimary"}
                                mb={2}
                              >
                                Deals by Stage
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={pipelineData}
                                  options={{
                                    ...chartOptions,
                                    indexAxis: "y",
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
                                />
                              </Box>
                            </Card>
                          </motion.div>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <motion.div variants={cardVariants}>
                            <Card
                              sx={{
                                background: darkMode
                                  ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                                  : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                                borderRadius: "12px",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                padding: "20px",
                                transition: "0.3s ease-in-out",
                                "&:hover": {
                                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                                  transform: "scale(1.02)",
                                },
                                height: "300px",
                                overflow: "hidden",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                color={darkMode ? "white" : "textPrimary"}
                                mb={2}
                              >
                                Average Deal Size by Stage
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={avgDealSizeData}
                                  options={{
                                    ...chartOptions,
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
                                />
                              </Box>
                            </Card>
                          </motion.div>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <motion.div variants={cardVariants}>
                            <Card
                              sx={{
                                background: darkMode
                                  ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                                  : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                                borderRadius: "12px",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                padding: "20px",
                                transition: "0.3s ease-in-out",
                                "&:hover": {
                                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                                  transform: "scale(1.02)",
                                },
                                height: "300px",
                                overflow: "hidden",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                color={darkMode ? "white" : "textPrimary"}
                                mb={2}
                              >
                                Overall Conversion Rate
                              </MDTypography>
                              <Grid container spacing={2} sx={{ height: "calc(100% - 40px)" }}>
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <MDTypography
                                    variant="h3"
                                    color={darkMode ? "white" : "textPrimary"}
                                  >
                                    {conversionRate.toFixed(2)}%
                                  </MDTypography>
                                </Grid>
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                  }}
                                >
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                  >
                                    <strong>Total Leads:</strong> {totalLeads}
                                  </MDTypography>
                                  <MDTypography
                                    variant="body2"
                                    color={darkMode ? "white" : "textSecondary"}
                                  >
                                    <strong>Closed Won:</strong> {closedWon}
                                  </MDTypography>
                                </Grid>
                              </Grid>
                            </Card>
                          </motion.div>
                        </Grid>
                      </Grid>
                    )}
                  </MDBox>
                </Paper>
              </motion.div>
            </Grid>
          )}

          {/* D. Team-Wise Sales Metrics (Aligned with ManageSales) */}
          {viewMode === "Sales" && (
            <Grid item xs={12}>
              <motion.div initial="hidden" animate="visible" variants={sectionVariants}>
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
                      Team Performance
                    </MDTypography>
                    <Tooltip title="Refresh Data">
                      <IconButton onClick={fetchData}>
                        <RefreshIcon sx={{ color: darkMode ? "#fff" : "#1976d2" }} />
                      </IconButton>
                    </Tooltip>
                  </MDBox>
                  <Divider />
                  <MDBox p={3}>
                    {teams.length === 0 ? (
                      <MDTypography>No team data available</MDTypography>
                    ) : (
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <motion.div variants={cardVariants}>
                            <Card
                              sx={{
                                background: darkMode
                                  ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                                  : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                                borderRadius: "12px",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                padding: "20px",
                                transition: "0.3s ease-in-out",
                                "&:hover": {
                                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                                  transform: "scale(1.02)",
                                },
                                height: "300px",
                                overflow: "hidden",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                color={darkMode ? "white" : "textPrimary"}
                                mb={2}
                              >
                                Revenue vs Quota
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={revenueVsQuotaData}
                                  options={{
                                    ...chartOptions,
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
                                />
                              </Box>
                            </Card>
                          </motion.div>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <motion.div variants={cardVariants}>
                            <Card
                              sx={{
                                background: darkMode
                                  ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                                  : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                                borderRadius: "12px",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                padding: "20px",
                                transition: "0.3s ease-in-out",
                                "&:hover": {
                                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                                  transform: "scale(1.02)",
                                },
                                height: "300px",
                                overflow: "hidden",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                color={darkMode ? "white" : "textPrimary"}
                                mb={2}
                              >
                                Sales Cycle Length
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="bar"
                                  data={salesCycleData}
                                  options={{
                                    ...chartOptions,
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
                                />
                              </Box>
                            </Card>
                          </motion.div>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <motion.div variants={cardVariants}>
                            <Card
                              sx={{
                                background: darkMode
                                  ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                                  : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                                borderRadius: "12px",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                padding: "20px",
                                transition: "0.3s ease-in-out",
                                "&:hover": {
                                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                                  transform: "scale(1.02)",
                                },
                                height: "300px",
                                overflow: "hidden",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                color={darkMode ? "white" : "textPrimary"}
                                mb={2}
                              >
                                Win Rate by Team
                              </MDTypography>
                              <Box sx={{ height: "calc(100% - 40px)" }}>
                                <Chart
                                  type="line"
                                  data={winRateData}
                                  options={{
                                    ...chartOptions,
                                    plugins: {
                                      ...chartOptions.plugins,
                                      legend: { labels: { color: darkMode ? "#fff" : "#333" } },
                                    },
                                    scales: {
                                      ...chartOptions.scales,
                                      x: {
                                        ...chartOptions.scales.x,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                      y: {
                                        ...chartOptions.scales.y,
                                        ticks: { color: darkMode ? "#fff" : "#333" },
                                        grid: {
                                          color: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        },
                                      },
                                    },
                                    plugins: {
                                      ...chartOptions.plugins,
                                      tooltip: {
                                        ...chartOptions.plugins.tooltip,
                                        backgroundColor: darkMode
                                          ? "rgba(0,0,0,0.8)"
                                          : "rgba(255,255,255,0.9)",
                                        titleColor: darkMode ? "#fff" : "#333",
                                        bodyColor: darkMode ? "#fff" : "#333",
                                        borderColor: darkMode ? "#555" : "#ccc",
                                      },
                                    },
                                  }}
                                />
                              </Box>
                            </Card>
                          </motion.div>
                        </Grid>
                      </Grid>
                    )}
                  </MDBox>
                </Paper>
              </motion.div>
            </Grid>
          )}
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

// PropTypes for FilterControls
FilterControls.propTypes = {
  dateRange: PropTypes.shape({
    start: PropTypes.instanceOf(Date).isRequired,
    end: PropTypes.instanceOf(Date).isRequired,
  }).isRequired,
  setDateRange: PropTypes.func.isRequired,
  selectedTeam: PropTypes.string.isRequired,
  setSelectedTeam: PropTypes.func.isRequired,
  teams: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      teamName: PropTypes.string.isRequired,
    })
  ).isRequired,
  darkMode: PropTypes.bool.isRequired,
};

export default DashboardPage;

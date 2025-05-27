import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  MenuItem,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { Navigate } from "react-router-dom";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Icon from "@mui/material/Icon";

const stages = ["Lead", "Negotiation", "Closed Won", "Closed Lost"];
const outcomes = ["Won", "Lost"];
const clientCategories = ["Hot", "Cold"];

const ManageSales = () => {
  const [openDealDialog, setOpenDealDialog] = useState(false);
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [openDateFilterDialog, setOpenDateFilterDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [filteredSalesData, setFilteredSalesData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState(null);
  const [editData, setEditData] = useState(null);
  const [dealFormError, setDealFormError] = useState("");
  const [teamFormError, setTeamFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for deals
  const [dealForm, setDealForm] = useState({
    dealId: "",
    stage: "",
    value: "",
    dateEntered: "",
    dateClosed: "",
    team: "",
    salesperson: "",
    outcome: "",
    clientCategory: "",
    region: "",
    product: "",
    upsellRevenue: "",
    crossSellRevenue: "",
    project: "",
    account: "",
  });

  // Form states for teams
  const [teamForm, setTeamForm] = useState({
    teamName: "",
    quota: "",
  });

  // Common styles adapted from ManageMarketing
  const formContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
    padding: "10px 20px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "80vh",
    overflowY: "auto",
    textAlign: "center",
    margin: "auto",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1200,
    transition: "transform 0.2s",
  };

  const formInputStyle = {
    display: "block",
    width: "100%",
    padding: "6px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "3px",
    fontSize: "12px",
    marginBottom: "10px",
  };

  const formSelectStyle = {
    ...formInputStyle,
    padding: "8px",
    borderRadius: "5px",
    height: "32px",
  };

  const formButtonStyle = {
    padding: "10px",
    borderRadius: "10px",
    margin: "10px",
    border: "none",
    color: "white",
    cursor: "pointer",
    backgroundColor: "#4caf50",
    width: "40%",
    fontSize: "14px",
  };

  const formLabelStyle = {
    fontSize: "14px",
    display: "block",
    width: "100%",
    marginTop: "6px",
    marginBottom: "4px",
    textAlign: "left",
    color: "#555",
    fontWeight: "bold",
  };

  const formHeadingStyle = {
    fontSize: "large",
    textAlign: "center",
    color: "#327c35",
    margin: "10px 0",
  };

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(collection(db, "users"), where("email", "==", user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            setUserRoles(userDoc.roles || []);
          } else {
            console.error("User not found in Firestore");
            setUserRoles([]);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setError("Failed to fetch user roles");
          setUserRoles([]);
        }
      }
      setLoadingRoles(false);
    };
    fetchUserRoles();
  }, []);

  // Fetch projects
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

  // Fetch accounts
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

  // Fetch sales data
  const fetchSalesData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const dealsSnapshot = await getDocs(collection(db, "deals"));
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const dealsData = dealsSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "deal",
        ...doc.data(),
      }));
      const teamsData = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "team",
        ...doc.data(),
      }));
      setTeams(teamsData);
      const combinedData = [...dealsData, ...teamsData];
      setSalesData(combinedData);
      setFilteredSalesData(combinedData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setError("Failed to fetch sales data");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  // Filter sales data based on search term and date range
  useEffect(() => {
    let filtered = [...salesData];
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.type === "deal"
          ? item.dealId.toLowerCase().includes(searchTerm.toLowerCase())
          : item.teamName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter((item) => {
        const createdAt = item.createdAt?.toDate
          ? item.createdAt.toDate()
          : new Date(item.createdAt);
        const start = dateRange.startDate
          ? new Date(dateRange.startDate.setHours(0, 0, 0, 0))
          : null;
        const end = dateRange.endDate
          ? new Date(dateRange.endDate.setHours(23, 59, 59, 999))
          : null;
        return (!start || createdAt >= start) && (!end || createdAt <= end);
      });
    }
    setFilteredSalesData(filtered);
  }, [salesData, searchTerm, dateRange]);

  const isReadOnly =
    userRoles.includes("ManageSales:read") && !userRoles.includes("ManageSales:full access");
  const hasAccess =
    userRoles.includes("ManageSales:read") || userRoles.includes("ManageSales:full access");

  const handleDialogOpen = (type, data = null) => {
    if (isReadOnly) return;
    setDealFormError("");
    setTeamFormError("");
    if (type === "deal") {
      if (data) {
        setDealForm({
          dealId: data.dealId || "",
          stage: data.stage || "",
          value: data.value?.toString() || "",
          dateEntered: data.dateEntered || "",
          dateClosed: data.dateClosed || "",
          team: data.team || "",
          salesperson: data.salesperson || "",
          outcome: data.outcome || "",
          clientCategory: data.clientCategory || "",
          region: data.region || "",
          product: data.product || "",
          upsellRevenue: data.upsellRevenue?.toString() || "",
          crossSellRevenue: data.crossSellRevenue?.toString() || "",
          project: data.project || "",
          account: data.account || "",
        });
        setEditData({ ...data, collection: "deals" });
      } else {
        resetDealForm();
        setEditData(null);
      }
      setOpenDealDialog(true);
    } else {
      if (data) {
        setTeamForm({
          teamName: data.teamName || "",
          quota: data.quota?.toString() || "",
        });
        setEditData({ ...data, collection: "teams" });
      } else {
        resetTeamForm();
        setEditData(null);
      }
      setOpenTeamDialog(true);
    }
  };

  const handleDialogClose = (type) => {
    if (type === "deal") {
      resetDealForm();
      setDealFormError("");
      setOpenDealDialog(false);
    } else {
      resetTeamForm();
      setTeamFormError("");
      setOpenTeamDialog(false);
    }
    setEditData(null);
  };

  const validateDealForm = () => {
    if (!dealForm.dealId.trim()) {
      return "Deal ID is required";
    }
    if (!dealForm.stage) {
      return "Stage is required";
    }
    const value = Number(dealForm.value);
    if (dealForm.value && (isNaN(value) || value < 0)) {
      return "Value must be a non-negative number";
    }
    if (dealForm.dateEntered && dealForm.dateClosed) {
      if (new Date(dealForm.dateClosed) < new Date(dealForm.dateEntered)) {
        return "Date Closed cannot be before Date Entered";
      }
    }
    const upsellRevenue = Number(dealForm.upsellRevenue);
    if (dealForm.upsellRevenue && (isNaN(upsellRevenue) || upsellRevenue < 0)) {
      return "Upsell Revenue must be a non-negative number";
    }
    const crossSellRevenue = Number(dealForm.crossSellRevenue);
    if (dealForm.crossSellRevenue && (isNaN(crossSellRevenue) || crossSellRevenue < 0)) {
      return "Cross-Sell Revenue must be a non-negative number";
    }
    return "";
  };

  const checkDuplicateDealId = async (dealId, excludeId = null) => {
    const q = query(collection(db, "deals"), where("dealId", "==", dealId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.some((doc) => doc.id !== excludeId);
  };

  const handleSubmitDeal = async () => {
    const validationError = validateDealForm();
    if (validationError) {
      setDealFormError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      const dealIdExists = await checkDuplicateDealId(dealForm.dealId, editData?.id);
      if (dealIdExists) {
        setDealFormError("Deal ID already exists");
        setIsSubmitting(false);
        return;
      }

      const dealData = {
        dealId: dealForm.dealId.trim(),
        stage: dealForm.stage,
        value: Number(dealForm.value) || 0,
        dateEntered: dealForm.dateEntered || new Date().toISOString().split("T")[0],
        dateClosed: dealForm.dateClosed || "",
        team: dealForm.team || "All",
        salesperson: dealForm.salesperson?.trim() || "",
        outcome: dealForm.outcome || "",
        clientCategory: dealForm.clientCategory || "",
        region: dealForm.region?.trim() || "",
        product: dealForm.product?.trim() || "",
        upsellRevenue: Number(dealForm.upsellRevenue) || 0,
        crossSellRevenue: Number(dealForm.crossSellRevenue) || 0,
        project: dealForm.project || "",
        account: dealForm.account || "",
        createdAt: new Date(),
      };

      if (editData) {
        await updateDoc(doc(db, "deals", editData.id), dealData);
      } else {
        await addDoc(collection(db, "deals"), dealData);
      }
      await fetchSalesData();
      handleDialogClose("deal");
    } catch (error) {
      console.error("Error saving deal:", error);
      setDealFormError("Failed to save deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateTeamForm = () => {
    if (!teamForm.teamName.trim()) {
      return "Team Name is required";
    }
    const quota = Number(teamForm.quota);
    if (teamForm.quota && (isNaN(quota) || quota < 0)) {
      return "Quota must be a non-negative number";
    }
    return "";
  };

  const handleSubmitTeam = async () => {
    const validationError = validateTeamForm();
    if (validationError) {
      setTeamFormError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      const teamData = {
        teamName: teamForm.teamName.trim(),
        quota: Number(teamForm.quota) || 0,
        createdAt: new Date(),
      };

      if (editData) {
        await updateDoc(doc(db, "teams", editData.id), teamData);
      } else {
        await addDoc(collection(db, "teams"), teamData);
      }
      await fetchSalesData();
      handleDialogClose("team");
    } catch (error) {
      console.error("Error saving team:", error);
      setTeamFormError("Failed to save team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (data) => {
    setDeleteItem(data);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (isReadOnly || !deleteItem) return;
    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, deleteItem.type === "deal" ? "deals" : "teams", deleteItem.id));
      await fetchSalesData();
      setConfirmDeleteOpen(false);
      setDeleteItem(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      setError("Failed to delete item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDealForm = () => {
    setDealForm({
      dealId: "",
      stage: "",
      value: "",
      dateEntered: "",
      dateClosed: "",
      team: "",
      salesperson: "",
      outcome: "",
      clientCategory: "",
      region: "",
      product: "",
      upsellRevenue: "",
      crossSellRevenue: "",
      project: "",
      account: "",
    });
  };

  const resetTeamForm = () => {
    setTeamForm({
      teamName: "",
      quota: "",
    });
  };

  const handleDateFilterApply = () => {
    setOpenDateFilterDialog(false);
  };

  const handleDateFilterReset = () => {
    setDateRange({ startDate: null, endDate: null });
    setOpenDateFilterDialog(false);
  };

  const handlePresetDateFilter = (months) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    setDateRange({ startDate, endDate });
  };

  const calculateSalesMetrics = () => {
    const deals = salesData.filter((item) => item.type === "deal");
    const teamsData = salesData.filter((item) => item.type === "team");

    const totalLeads = deals.filter((deal) => deal.stage === "Lead").length;
    const closedWon = deals.filter((deal) => deal.outcome === "Won").length;
    const leadConversionRate = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0;

    const closedDeals = deals.filter((deal) => deal.outcome === "Won");
    const totalRevenue = closedDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
    const averageDealSize = closedDeals.length > 0 ? totalRevenue / closedDeals.length : 0;

    const salesCycleLengths = closedDeals.map((deal) => {
      const entered = new Date(deal.dateEntered);
      const closed = deal.dateClosed ? new Date(deal.dateClosed) : new Date();
      return (closed - entered) / (1000 * 60 * 60 * 24);
    });
    const averageSalesCycle =
      salesCycleLengths.length > 0
        ? salesCycleLengths.reduce((sum, len) => sum + len, 0) / salesCycleLengths.length
        : 0;

    const teamMetrics = teamsData.map((team) => {
      const teamDeals = deals.filter((deal) => deal.team === team.teamName);
      const teamClosedWon = teamDeals.filter((deal) => deal.outcome === "Won").length;
      const teamRevenue = teamDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
      const winRate = teamDeals.length > 0 ? (teamClosedWon / teamDeals.length) * 100 : 0;
      const quotaAttainment = team.quota > 0 ? (teamRevenue / team.quota) * 100 : 0;
      return { teamName: team.teamName, winRate, quotaAttainment };
    });

    return { leadConversionRate, averageDealSize, averageSalesCycle, teamMetrics };
  };

  const renderSalesCard = (data) => {
    const { teamMetrics } = calculateSalesMetrics();
    const isDeal = data.type === "deal";

    return (
      <Grid item xs={12} key={data.id}>
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
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box
            sx={{
              width: { xs: "100%", sm: "120px" },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDeal ? "#4caf50" : "#2196f3",
              borderRadius: { xs: "8px 8px 0 0", sm: "8px 0 0 8px" },
              marginRight: { sm: "16px" },
              marginBottom: { xs: "16px", sm: 0 },
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            <MDTypography
              variant="body2"
              color="white"
              sx={{ fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}
            >
              {isDeal ? "Deal" : "Team"}
            </MDTypography>
          </Box>
          <Box sx={{ flexGrow: 1, width: { xs: "100%", sm: "auto" } }}>
            <CardContent>
              <Grid container spacing={2}>
                {isDeal ? (
                  <>
                    <Grid item xs={12} sm={6}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Deal ID: </span>
                        <span style={{ fontWeight: "bold" }}>{data.dealId || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Stage: </span>
                        <span style={{ fontWeight: "bold" }}>{data.stage || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Value: </span>
                        <span style={{ fontWeight: "bold" }}>${Number(data.value)?.toLocaleString() || "0"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Client Category: </span>
                        <span style={{ fontWeight: "bold" }}>{data.clientCategory || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Region: </span>
                        <span style={{ fontWeight: "bold" }}>{data.region || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Product: </span>
                        <span style={{ fontWeight: "bold" }}>{data.product || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Upsell Revenue: </span>
                        <span style={{ fontWeight: "bold" }}>${Number(data.upsellRevenue)?.toLocaleString() || "0"}</span>
                      </MDTypography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Cross-Sell Revenue: </span>
                        <span style={{ fontWeight: "bold" }}>${Number(data.crossSellRevenue)?.toLocaleString() || "0"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Project: </span>
                        <span style={{ fontWeight: "bold" }}>{data.project || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Account: </span>
                        <span style={{ fontWeight: "bold" }}>{data.account || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Salesperson: </span>
                        <span style={{ fontWeight: "bold" }}>{data.salesperson || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Outcome: </span>
                        <span style={{ fontWeight: "bold" }}>{data.outcome || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Sales Cycle: </span>
                        <span style={{ fontWeight: "bold" }}>
                          {data.dateEntered && data.dateClosed
                            ? `${Math.round(
                                (new Date(data.dateClosed) - new Date(data.dateEntered)) /
                                  (1000 * 60 * 60 * 24)
                              )} days`
                            : "N/A"}
                        </span>
                      </MDTypography>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={12} sm={6}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Team Name: </span>
                        <span style={{ fontWeight: "bold" }}>{data.teamName || "N/A"}</span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Quota: </span>
                        <span style={{ fontWeight: "bold" }}>${Number(data.quota)?.toLocaleString() || "0"}</span>
                      </MDTypography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Quota Attainment: </span>
                        <span style={{ fontWeight: "bold" }}>
                          {(
                            teamMetrics?.find((tm) => tm.teamName === data.teamName)
                              ?.quotaAttainment ?? 0
                          ).toFixed(2)}%
                        </span>
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                        <span>Win Rate: </span>
                        <span style={{ fontWeight: "bold" }}>
                          {(
                            teamMetrics?.find((tm) => tm.teamName === data.teamName)?.winRate ?? 0
                          ).toFixed(2)}%
                        </span>
                      </MDTypography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
            {!isReadOnly && (
              <CardActions
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  justifyContent: { xs: "space-between", sm: "flex-end" },
                  alignItems: "center",
                  padding: "8px 16px",
                }}
              >
                <MDButton
                  variant="gradient"
                  color={darkMode ? "dark" : "info"}
                  onClick={() => handleDialogOpen(data.type, data)}
                  sx={{
                    flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
                    minWidth: { xs: "100px", sm: "100px" },
                    maxWidth: { xs: "calc(50% - 8px)", sm: "100px" },
                    padding: "8px 16px",
                    fontSize: "14px",
                  }}
                >
                  <Icon fontSize="medium">edit</Icon> Edit
                </MDButton>
                <MDButton
                  variant="gradient"
                  color="error"
                  onClick={() => handleDelete(data)}
                  sx={{
                    flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
                    minWidth: { xs: "100px", sm: "100px" },
                    maxWidth: { xs: "calc(50% - 8px)", sm: "100px" },
                    padding: "8px 16px",
                    fontSize: "14px",
                  }}
                >
                  <Icon fontSize="medium">delete</Icon> Delete
                </MDButton>
              </CardActions>
            )}
          </Box>
        </Card>
      </Grid>
    );
  };

  if (loadingRoles || loadingData || loadingProjects || loadingAccounts) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: darkMode ? "#212121" : "#f3f3f3",
        }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          Loading...
        </MDTypography>
      </Box>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" />;
  }

  const { leadConversionRate, averageDealSize, averageSalesCycle } = calculateSalesMetrics();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          backgroundColor: darkMode ? "#212121" : "#f3f3f3",
          minHeight: "100vh",
        }}
      >
        <DashboardNavbar
          absolute
          light={!darkMode}
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
            backgroundColor: darkMode ? "#212121" : "#f3f3f3",
            minHeight: "calc(100vh - 80px)",
            paddingTop: { xs: "32px", md: "24px" },
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
                  <MDTypography variant="h6" color="white">
                    Sales Management
                  </MDTypography>
                </MDBox>
                <MDBox
                  pt={3}
                  pb={2}
                  px={2}
                  display="flex"
                  flexDirection={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  gap={2}
                  justifyContent="space-between"
                >
                  <Box
                    display="flex"
                    flexDirection={{ xs: "column", sm: "row" }}
                    gap={2}
                    width={{ xs: "100%", sm: "auto" }}
                  >
                    {!isReadOnly && (
                      <>
                        <MDButton
                          variant="gradient"
                          color={darkMode ? "dark" : "info"}
                          onClick={() => handleDialogOpen("deal")}
                          fullWidth={{ xs: true, sm: false }}
                        >
                          Add Deal
                        </MDButton>
                        <MDButton
                          variant="gradient"
                          color={darkMode ? "dark" : "info"}
                          onClick={() => handleDialogOpen("team")}
                          fullWidth={{ xs: true, sm: false }}
                        >
                          Add Team
                        </MDButton>
                      </>
                    )}
                    <TextField
                      label="Search by Deal ID/Team Name"
                      variant="outlined"
                      size="small"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      sx={{
                        width: { xs: "100%", sm: 300 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                          backgroundColor: darkMode ? "#424242" : "#fff",
                          color: darkMode ? "white" : "black",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode ? "#fff" : "#ddd",
                          },
                        },
                        "& .MuiInputLabel-root": {
                          color: darkMode ? "white" : "black",
                        },
                      }}
                    />
                  </Box>
                  <Box
                    display="flex"
                    gap={2}
                    alignItems="center"
                    width={{ xs: "100%", sm: "auto" }}
                  >
                    <Tooltip title="Refresh Data">
                      <IconButton onClick={fetchSalesData}>
                        <RefreshIcon
                          sx={{ color: darkMode ? "#fff" : "#1976d2" }}
                        />
                      </IconButton>
                    </Tooltip>
                    <MDButton
                      variant="outlined"
                      onClick={() => setOpenDateFilterDialog(true)}
                      sx={{
                        height: 40,
                        color: darkMode ? "white" : "#1976d2",
                        borderColor: darkMode ? "white" : "#1976d2",
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      <CalendarTodayIcon sx={{ mr: 1 }} />
                      Filter by Date
                    </MDButton>
                  </Box>
                </MDBox>
                <MDBox px={2} pb={2}>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                    <span>Lead Conversion Rate: </span>
                    <span style={{ fontWeight: "bold" }}>{leadConversionRate.toFixed(2)}%</span>
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} sx={{ mb: 1 }}>
                    <span>Average Deal Size: </span>
                    <span style={{ fontWeight: "bold" }}>${averageDealSize.toFixed(0)}</span>
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"} mb={2}>
                    <span>Average Sales Cycle: </span>
                    <span style={{ fontWeight: "bold" }}>{averageSalesCycle.toFixed(0)} days</span>
                  </MDTypography>
                </MDBox>
                <Grid container spacing={3} sx={{ padding: "16px" }}>
                  {error && (
                    <MDTypography color="error" mb={2}>
                      {error}
                    </MDTypography>
                  )}
                  {filteredSalesData.length === 0 ? (
                    <MDTypography color={darkMode ? "white" : "textPrimary"}>
                      No data available
                    </MDTypography>
                  ) : (
                    filteredSalesData.map(renderSalesCard)
                  )}
                </Grid>
              </Card>
            </Grid>
          </Grid>
        </MDBox>
        <Box
          sx={{
            marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
            backgroundColor: darkMode ? "#212121" : "#f3f3f3",
          }}
        >
          <Footer />
        </Box>

        {!isReadOnly && (
          <>
            {/* Deal Dialog */}
            <Box sx={{ ...formContainerStyle, display: openDealDialog ? "block" : "none" }}>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitDeal(); }}>
                <MDTypography sx={formHeadingStyle}>
                  {editData ? "Edit Deal" : "Add Deal"}
                </MDTypography>
                {dealFormError && (
                  <MDTypography color="error" mb={2} sx={{ fontSize: "14px" }}>
                    {dealFormError}
                  </MDTypography>
                )}
                <DealForm
                  dealForm={dealForm}
                  setDealForm={setDealForm}
                  stages={stages}
                  outcomes={outcomes}
                  teams={teams.map((t) => t.teamName)}
                  clientCategories={clientCategories}
                  projects={projects}
                  accounts={accounts}
                  darkMode={darkMode}
                  formStyle={{ border: "none" }}
                  labelStyle={formLabelStyle}
                  inputStyle={formInputStyle}
                  selectStyle={formSelectStyle}
                />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <button
                    type="button"
                    style={formButtonStyle}
                    onClick={() => handleDialogClose("deal")}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={formButtonStyle}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <CircularProgress size={20} color="inherit" /> : (editData ? "Update Deal" : "Save Deal")}
                  </button>
                </Box>
              </form>
            </Box>

            {/* Team Dialog */}
            <Box sx={{ ...formContainerStyle, display: openTeamDialog ? "block" : "none" }}>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitTeam(); }}>
                <MDTypography sx={formHeadingStyle}>
                  {editData ? "Edit Team" : "Add Team"}
                </MDTypography>
                {teamFormError && (
                  <MDTypography color="error" mb={2} sx={{ fontSize: "14px" }}>
                    {teamFormError}
                  </MDTypography>
                )}
                <TeamForm
                  teamForm={teamForm}
                  setTeamForm={setTeamForm}
                  darkMode={darkMode}
                  formStyle={{ border: "none" }}
                  labelStyle={formLabelStyle}
                  inputStyle={formInputStyle}
                />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <button
                    type="button"
                    style={formButtonStyle}
                    onClick={() => handleDialogClose("team")}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={formButtonStyle}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <CircularProgress size={20} color="inherit" /> : (editData ? "Update Team" : "Save Team")}
                  </button>
                </Box>
              </form>
            </Box>

            {/* Delete Confirmation Dialog */}
            <Box sx={{ ...formContainerStyle, display: confirmDeleteOpen ? "block" : "none" }}>
              <MDTypography sx={formHeadingStyle}>
                Want to delete {deleteItem?.type === "deal" ? "deal" : "team"}?
              </MDTypography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  style={formButtonStyle}
                  onClick={() => setConfirmDeleteOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{ ...formButtonStyle, backgroundColor: "#f44336" }}
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting || !deleteItem}
                >
                  {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Delete"}
                </button>
              </Box>
            </Box>

            {/* Date Filter Dialog */}
            <Box sx={{ ...formContainerStyle, display: openDateFilterDialog ? "block" : "none" }}>
              <form onSubmit={(e) => { e.preventDefault(); handleDateFilterApply(); }}>
                <MDTypography sx={formHeadingStyle}>Filter by Date Range</MDTypography>
                <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => handlePresetDateFilter(1)}
                    sx={{
                      color: darkMode ? "white" : "#1976d2",
                      borderColor: darkMode ? "white" : "#1976d2",
                      fontSize: "12px",
                      padding: "6px 12px",
                      flex: { xs: "1 1 calc(33% - 8px)", sm: "0 0 auto" },
                    }}
                  >
                    Last 1 Month
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handlePresetDateFilter(3)}
                    sx={{
                      color: darkMode ? "white" : "#1976d2",
                      borderColor: darkMode ? "white" : "#1976d2",
                      fontSize: "12px",
                      padding: "6px 12px",
                      flex: { xs: "1 1 calc(33% - 8px)", sm: "0 0 auto" },
                    }}
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handlePresetDateFilter(6)}
                    sx={{
                      color: darkMode ? "white" : "#1976d2",
                      borderColor: darkMode ? "white" : "#1976d2",
                      fontSize: "12px",
                      padding: "6px 12px",
                      flex: { xs: "1 1 calc(33% - 8px)", sm: "0 0 auto" },
                    }}
                  >
                    Last 6 Months
                  </Button>
                </Box>
                <label style={formLabelStyle}>Start Date</label>
                <DatePicker
                  value={dateRange.startDate}
                  onChange={(newValue) =>
                    setDateRange({ ...dateRange, startDate: newValue })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": {
                          ...formInputStyle,
                          padding: "6px",
                          fontSize: "12px",
                        },
                        "& .MuiInputLabel-root": {
                          ...formLabelStyle,
                          fontSize: "14px",
                        },
                        marginBottom: "10px",
                      }}
                    />
                  )}
                />
                <label style={formLabelStyle}>End Date</label>
                <DatePicker
                  value={dateRange.endDate}
                  onChange={(newValue) =>
                    setDateRange({ ...dateRange, endDate: newValue })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": {
                          ...formInputStyle,
                          padding: "6px",
                          fontSize: "12px",
                        },
                        "& .MuiInputLabel-root": {
                          ...formLabelStyle,
                          fontSize: "14px",
                        },
                        marginBottom: "10px",
                      }}
                    />
                  )}
                />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <button
                    type="button"
                    style={formButtonStyle}
                    onClick={handleDateFilterReset}
                  >
                    Reset
                  </button>
                  <button type="submit" style={formButtonStyle}>
                    Apply
                  </button>
                </Box>
              </form>
            </Box>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

// DealForm Component
const DealForm = ({
  dealForm,
  setDealForm,
  stages,
  teams,
  outcomes,
  clientCategories,
  projects,
  accounts,
  darkMode,
  formStyle,
  labelStyle,
  inputStyle,
  selectStyle,
}) => {
  return (
    <fieldset style={formStyle}>
      <label style={labelStyle} htmlFor="dealId">Deal ID</label>
      <input
        style={inputStyle}
        type="text"
        id="dealId"
        value={dealForm.dealId}
        onChange={(e) => setDealForm({ ...dealForm, dealId: e.target.value })}
        placeholder="Enter Deal ID"
        required
      />

      <label style={labelStyle} htmlFor="stage">Stage</label>
      <select
        style={selectStyle}
        id="stage"
        value={dealForm.stage}
        onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value })}
        required
      >
        <option value="" disabled>Select Stage</option>
        {stages.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>

      <label style={labelStyle} htmlFor="value">Value ($)</label>
      <input
        style={inputStyle}
        type="number"
        id="value"
        value={dealForm.value}
        onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
        placeholder="Enter Value"
        min="0"
      />

      <label style={labelStyle} htmlFor="dateEntered">Date Entered</label>
      <input
        style={inputStyle}
        type="date"
        id="dateEntered"
        value={dealForm.dateEntered}
        onChange={(e) => setDealForm({ ...dealForm, dateEntered: e.target.value })}
      />

      <label style={labelStyle} htmlFor="dateClosed">Date Closed</label>
      <input
        style={inputStyle}
        type="date"
        id="dateClosed"
        value={dealForm.dateClosed}
        onChange={(e) => setDealForm({ ...dealForm, dateClosed: e.target.value })}
      />

      <label style={labelStyle} htmlFor="team">Team</label>
      <select
        style={selectStyle}
        id="team"
        value={dealForm.team}
        onChange={(e) => setDealForm({ ...dealForm, team: e.target.value })}
      >
        <option value="" disabled>Select Team</option>
        {teams.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <label style={labelStyle} htmlFor="salesperson">Salesperson</label>
      <input
        style={inputStyle}
        type="text"
        id="salesperson"
        value={dealForm.salesperson}
        onChange={(e) => setDealForm({ ...dealForm, salesperson: e.target.value })}
        placeholder="Enter Salesperson"
      />

      <label style={labelStyle} htmlFor="outcome">Outcome</label>
      <select
        style={selectStyle}
        id="outcome"
        value={dealForm.outcome}
        onChange={(e) => setDealForm({ ...dealForm, outcome: e.target.value })}
      >
        <option value="" disabled>Select Outcome</option>
        {outcomes.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      <label style={labelStyle} htmlFor="clientCategory">Client Category</label>
      <select
        style={selectStyle}
        id="clientCategory"
        value={dealForm.clientCategory}
        onChange={(e) => setDealForm({ ...dealForm, clientCategory: e.target.value })}
      >
        <option value="" disabled>Select Client Category</option>
        {clientCategories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <label style={labelStyle} htmlFor="region">Region</label>
      <input
        style={inputStyle}
        type="text"
        id="region"
        value={dealForm.region}
        onChange={(e) => setDealForm({ ...dealForm, region: e.target.value })}
        placeholder="Enter Region"
      />

      <label style={labelStyle} htmlFor="product">Product</label>
      <input
        style={inputStyle}
        type="text"
        id="product"
        value={dealForm.product}
        onChange={(e) => setDealForm({ ...dealForm, product: e.target.value })}
        placeholder="Enter Product"
      />

      <label style={labelStyle} htmlFor="upsellRevenue">Upsell Revenue ($)</label>
      <input
        style={inputStyle}
        type="number"
        id="upsellRevenue"
        value={dealForm.upsellRevenue}
        onChange={(e) => setDealForm({ ...dealForm, upsellRevenue: e.target.value })}
        placeholder="Enter Upsell Revenue"
        min="0"
      />

      <label style={labelStyle} htmlFor="crossSellRevenue">Cross-Sell Revenue ($)</label>
      <input
        style={inputStyle}
        type="number"
        id="crossSellRevenue"
        value={dealForm.crossSellRevenue}
        onChange={(e) => setDealForm({ ...dealForm, crossSellRevenue: e.target.value })}
        placeholder="Enter Cross-Sell Revenue"
        min="0"
      />

      <label style={labelStyle} htmlFor="project">Project</label>
      <select
        style={selectStyle}
        id="project"
        value={dealForm.project}
        onChange={(e) => setDealForm({ ...dealForm, project: e.target.value })}
      >
        <option value="" disabled>Select Project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.name}>{p.name}</option>
        ))}
      </select>

      <label style={labelStyle} htmlFor="account">Account</label>
      <select
        style={selectStyle}
        id="account"
        value={dealForm.account}
        onChange={(e) => setDealForm({ ...dealForm, account: e.target.value })}
      >
        <option value="" disabled>Select Account</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.name}>{a.name}</option>
        ))}
      </select>
    </fieldset>
  );
};

// TeamForm Component
const TeamForm = ({ teamForm, setTeamForm, darkMode, formStyle, labelStyle, inputStyle }) => {
  return (
    <fieldset style={formStyle}>
      <label style={labelStyle} htmlFor="teamName">Team Name</label>
      <input
        style={inputStyle}
        type="text"
        id="teamName"
        value={teamForm.teamName}
        onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })}
        placeholder="Enter Team Name"
        required
      />

      <label style={labelStyle} htmlFor="quota">Quota ($)</label>
      <input
        style={inputStyle}
        type="number"
        id="quota"
        value={teamForm.quota}
        onChange={(e) => setTeamForm({ ...teamForm, quota: e.target.value })}
        placeholder="Enter Quota"
        min="0"
      />
    </fieldset>
  );
};

// PropTypes
DealForm.propTypes = {
  dealForm: PropTypes.shape({
    dealId: PropTypes.string,
    stage: PropTypes.string,
    value: PropTypes.string,
    dateEntered: PropTypes.string,
    dateClosed: PropTypes.string,
    team: PropTypes.string,
    salesperson: PropTypes.string,
    outcome: PropTypes.string,
    clientCategory: PropTypes.string,
    region: PropTypes.string,
    product: PropTypes.string,
    upsellRevenue: PropTypes.string,
    crossSellRevenue: PropTypes.string,
    project: PropTypes.string,
    account: PropTypes.string,
  }).isRequired,
  setDealForm: PropTypes.func.isRequired,
  stages: PropTypes.arrayOf(PropTypes.string).isRequired,
  teams: PropTypes.arrayOf(PropTypes.string).isRequired,
  outcomes: PropTypes.arrayOf(PropTypes.string).isRequired,
  clientCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  projects: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  darkMode: PropTypes.bool.isRequired,
  formStyle: PropTypes.object.isRequired,
  labelStyle: PropTypes.object.isRequired,
  inputStyle: PropTypes.object.isRequired,
  selectStyle: PropTypes.object.isRequired,
};

TeamForm.propTypes = {
  teamForm: PropTypes.shape({
    teamName: PropTypes.string,
    quota: PropTypes.string,
  }).isRequired,
  setTeamForm: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
  formStyle: PropTypes.object.isRequired,
  labelStyle: PropTypes.object.isRequired,
  inputStyle: PropTypes.object.isRequired,
};

export default ManageSales;
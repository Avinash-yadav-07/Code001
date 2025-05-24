import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Typography,
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
          }}
        >
          {isDeal && (
            <Box
              sx={{
                width: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  data.team && data.team !== "All" ? "#4caf50" : darkMode ? "#757575" : "#f5f5f5",
                borderRadius: "8px 0 0 8px",
                marginRight: "16px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              <MDTypography
                variant="body2"
                color={darkMode ? "white" : "white"}
                sx={{ fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}
              >
                {data.team && data.team !== "All" ? data.team : "No Team"}
              </MDTypography>
            </Box>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <CardContent>
              <Grid container spacing={2}>
                {isDeal ? (
                  <>
                    <Grid item xs={12} sm={6}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Deal ID:</strong> {data.dealId || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Stage:</strong> {data.stage || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Value:</strong> ${Number(data.value)?.toLocaleString() || "0"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Client Category:</strong> {data.clientCategory || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Region:</strong> {data.region || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Product:</strong> {data.product || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Upsell Revenue:</strong> $
                        {Number(data.upsellRevenue)?.toLocaleString() || "0"}
                      </MDTypography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Cross-Sell Revenue:</strong> $
                        {Number(data.crossSellRevenue)?.toLocaleString() || "0"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Project:</strong> {data.project || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Account:</strong> {data.account || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Salesperson:</strong> {data.salesperson || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Outcome:</strong> {data.outcome || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Sales Cycle:</strong>{" "}
                        {data.dateEntered && data.dateClosed
                          ? `${Math.round(
                              (new Date(data.dateClosed) - new Date(data.dateEntered)) /
                                (1000 * 60 * 60 * 24)
                            )} days`
                          : "N/A"}
                      </MDTypography>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={12} sm={6}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Team Name:</strong> {data.teamName || "N/A"}
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Quota:</strong> ${Number(data.quota)?.toLocaleString() || "0"}
                      </MDTypography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Quota Attainment:</strong>{" "}
                        {(
                          teamMetrics?.find((tm) => tm.teamName === data.teamName)
                            ?.quotaAttainment ?? 0
                        ).toFixed(2)}
                        %
                      </MDTypography>
                      <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                        <strong>Win Rate:</strong>{" "}
                        {(
                          teamMetrics?.find((tm) => tm.teamName === data.teamName)?.winRate ?? 0
                        ).toFixed(2)}
                        %
                      </MDTypography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
            {!isReadOnly && (
              <CardActions sx={{ display: "flex", justifyContent: "flex-end" }}>
                <MDButton
                  variant="gradient"
                  color={darkMode ? "dark" : "info"}
                  onClick={() => handleDialogOpen(data.type, data)}
                >
                  <Icon fontSize="medium">edit</Icon> Edit
                </MDButton>
                <MDButton variant="gradient" color="error" onClick={() => handleDelete(data)}>
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
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
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
                  <MDTypography variant="h6" color="white">
                    Sales Management
                  </MDTypography>
                </MDBox>
                <MDBox
                  pt={3}
                  pb={2}
                  px={2}
                  display="flex"
                  alignItems="center"
                  gap={2}
                  justifyContent="space-between"
                >
                  <Box display="flex" gap={2}>
                    {!isReadOnly && (
                      <>
                        <MDButton
                          variant="gradient"
                          color={darkMode ? "dark" : "info"}
                          onClick={() => handleDialogOpen("deal")}
                        >
                          Add Deal
                        </MDButton>
                        <MDButton
                          variant="gradient"
                          color={darkMode ? "dark" : "info"}
                          onClick={() => handleDialogOpen("team")}
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
                        maxWidth: 300,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                          backgroundColor: darkMode ? "#424242" : "#fff",
                          color: darkMode ? "white" : "black",
                        },
                        "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                      }}
                    />
                  </Box>
                  <Box display="flex" gap={2} alignItems="center">
                    <Tooltip title="Refresh Data">
                      <IconButton onClick={fetchSalesData}>
                        <RefreshIcon sx={{ color: darkMode ? "#fff" : "#1976d2" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Filter by Date">
                      <IconButton onClick={() => setOpenDateFilterDialog(true)}>
                        <CalendarTodayIcon sx={{ color: darkMode ? "#fff" : "#1976d2" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </MDBox>
                <MDBox px={2} pb={2}>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Lead Conversion Rate:</strong> {leadConversionRate.toFixed(2)}%
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Average Deal Size:</strong> ${averageDealSize.toFixed(2)}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Average Sales Cycle:</strong> {averageSalesCycle.toFixed(2)} days
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
            backgroundColor: darkMode ? "background.default" : "background.paper",
            zIndex: 1100,
          }}
        >
          <Footer />
        </Box>

        {!isReadOnly && (
          <>
            {/* Deal Dialog */}
            <Dialog
              open={openDealDialog}
              onClose={() => handleDialogClose("deal")}
              maxWidth="md"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                {editData ? "Edit Deal" : "Add Deal"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                {dealFormError && (
                  <MDTypography color="error" mb={2}>
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
                />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => handleDialogClose("deal")}
                  sx={{ color: darkMode ? "white" : "black" }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitDeal}
                  color="primary"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {editData ? "Update Deal" : "Save Deal"}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Team Dialog */}
            <Dialog
              open={openTeamDialog}
              onClose={() => handleDialogClose("team")}
              maxWidth="md"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                {editData ? "Edit Team" : "Add Team"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                {teamFormError && (
                  <MDTypography color="error" mb={2}>
                    {teamFormError}
                  </MDTypography>
                )}
                <TeamForm teamForm={teamForm} setTeamForm={setTeamForm} darkMode={darkMode} />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => handleDialogClose("team")}
                  sx={{ color: darkMode ? "white" : "black" }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitTeam}
                  color="primary"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {editData ? "Update Team" : "Save Team"}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
              open={confirmDeleteOpen}
              onClose={() => setConfirmDeleteOpen(false)}
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                Want to delete {deleteItem?.type === "deal" ? "deal" : "team"}?
              </DialogTitle>
              <DialogActions>
                <Button
                  onClick={() => setConfirmDeleteOpen(false)}
                  sx={{ color: darkMode ? "white" : "black" }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  color="error"
                  disabled={isSubmitting || !deleteItem}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>

            {/* Date Filter Dialog */}
            <Dialog
              open={openDateFilterDialog}
              onClose={() => setOpenDateFilterDialog(false)}
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                Filter by Date Range
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <Box sx={{ mb: 2, bgcolor: darkMode ? "black" : "white" }}>
                  <Button
                    variant="outlined"
                    onClick={() => handlePresetDateFilter(1)}
                    sx={{
                      mr: 1,
                      color: "blue",
                      borderColor: "green",
                    }}
                  >
                    Last 1 Month
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handlePresetDateFilter(1)}
                    sx={{
                      mr: 1,
                      color: "blue",
                      borderColor: "green",
                    }}
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handlePresetDateFilter(1)}
                    sx={{
                      mr: 1,
                      color: "blue",
                      borderColor: "green",
                    }}
                  >
                    Last 6 Months
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Start Date"
                      value={dateRange.startDate}
                      onChange={(newValue) => setDateRange({ ...dateRange, startDate: newValue })}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          sx={{
                            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
                            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="End Date"
                      value={dateRange.endDate}
                      onChange={(newValue) => setDateRange({ ...dateRange, endDate: newValue })}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          sx={{
                            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
                            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleDateFilterReset}
                  sx={{ color: darkMode ? "white" : "black" }}
                >
                  Reset
                </Button>
                <Button onClick={handleDateFilterApply} color="primary">
                  Apply
                </Button>
              </DialogActions>
            </Dialog>
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
  outcomes,
  teams,
  clientCategories,
  projects,
  accounts,
  darkMode,
}) => {
  return (
    <Grid container spacing={2} sx={{ pt: 2 }}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Deal ID"
          value={dealForm.dealId}
          onChange={(e) => setDealForm({ ...dealForm, dealId: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Stage"
          value={dealForm.stage}
          onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
          required
        >
          {stages.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Value ($)"
          type="number"
          value={dealForm.value}
          onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Date Entered"
          type="date"
          value={dealForm.dateEntered}
          onChange={(e) => setDealForm({ ...dealForm, dateEntered: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Date Closed"
          type="date"
          value={dealForm.dateClosed}
          onChange={(e) => setDealForm({ ...dealForm, dateClosed: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Team"
          value={dealForm.team}
          onChange={(e) => setDealForm({ ...dealForm, team: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {teams.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Salesperson"
          value={dealForm.salesperson}
          onChange={(e) => setDealForm({ ...dealForm, salesperson: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Outcome"
          value={dealForm.outcome}
          onChange={(e) => setDealForm({ ...dealForm, outcome: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {outcomes.map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Client Category"
          value={dealForm.clientCategory}
          onChange={(e) => setDealForm({ ...dealForm, clientCategory: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {clientCategories.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Region"
          value={dealForm.region}
          onChange={(e) => setDealForm({ ...dealForm, region: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Product"
          value={dealForm.product}
          onChange={(e) => setDealForm({ ...dealForm, product: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Upsell Revenue ($)"
          type="number"
          value={dealForm.upsellRevenue}
          onChange={(e) => setDealForm({ ...dealForm, upsellRevenue: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Cross-Sell Revenue ($)"
          type="number"
          value={dealForm.crossSellRevenue}
          onChange={(e) => setDealForm({ ...dealForm, crossSellRevenue: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Project"
          value={dealForm.project}
          onChange={(e) => setDealForm({ ...dealForm, project: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.name}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Account"
          value={dealForm.account}
          onChange={(e) => setDealForm({ ...dealForm, account: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {accounts.map((a) => (
            <MenuItem key={a.id} value={a.name}>
              {a.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  );
};

// TeamForm Component
const TeamForm = ({ teamForm, setTeamForm, darkMode }) => {
  return (
    <Grid container spacing={2} sx={{ pt: 2 }}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Team Name"
          value={teamForm.teamName}
          onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Quota ($)"
          type="number"
          value={teamForm.quota}
          onChange={(e) => setTeamForm({ ...teamForm, quota: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>
    </Grid>
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
  outcomes: PropTypes.arrayOf(PropTypes.string).isRequired,
  teams: PropTypes.arrayOf(PropTypes.string).isRequired,
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
};

TeamForm.propTypes = {
  teamForm: PropTypes.shape({
    teamName: PropTypes.string,
    quota: PropTypes.string,
  }).isRequired,
  setTeamForm: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
};

export default ManageSales;

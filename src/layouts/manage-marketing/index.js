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
  Icon,
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

const channels = ["LinkedIn", "Google Ads", "Facebook", "Email", "Other"];
const campaignTypes = ["Email", "Social", "Paid"];
const teams = ["Team A", "Team B", "Team C", "All", "Custom"];

const ManageMarketing = () => {
  const [openLeadDialog, setOpenLeadDialog] = useState(false);
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [openDateFilterDialog, setOpenDateFilterDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [marketingData, setMarketingData] = useState([]);
  const [filteredMarketingData, setFilteredMarketingData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  const [editData, setEditData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Form states for leads
  const [leadForm, setLeadForm] = useState({
    channel: "",
    leads: "",
    marketingQualifiedLeads: "",
    salesQualifiedLeads: "",
    conversions: "",
    spend: "",
    team: "",
    customTeam: "",
    project: "",
    account: "",
  });

  // Form states for campaigns
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "",
    cost: "",
    revenue: "",
    clickThroughRate: "",
    likes: "",
    impressions: "",
    team: "",
    customTeam: "",
    project: "",
    account: "",
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

  // Fetch marketing data
  const fetchMarketingData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const leadsSnapshot = await getDocs(collection(db, "leads"));
      const campaignsSnapshot = await getDocs(collection(db, "campaigns"));
      const leadsData = leadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "lead",
        ...doc.data(),
      }));
      const campaignsData = campaignsSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "campaign",
        ...doc.data(),
      }));
      const combinedData = [...leadsData, ...campaignsData];
      setMarketingData(combinedData);
      setFilteredMarketingData(combinedData);
    } catch (error) {
      console.error("Error fetching marketing data:", error);
      setError("Failed to fetch marketing data");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchMarketingData();
  }, []);

  // Filter marketing data based on search term and date range
  useEffect(() => {
    let filtered = [...marketingData];
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.type === "lead"
          ? item.channel.toLowerCase().includes(searchTerm.toLowerCase())
          : item.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    setFilteredMarketingData(filtered);
  }, [marketingData, searchTerm, dateRange]);

  const isReadOnly =
    userRoles.includes("ManageMarketing:read") &&
    !userRoles.includes("ManageMarketing:full access");
  const hasAccess =
    userRoles.includes("ManageMarketing:read") || userRoles.includes("ManageMarketing:full access");

  const handleDialogOpen = (type, data = null) => {
    if (isReadOnly) return;
    if (type === "lead") {
      if (data) {
        setLeadForm({
          channel: data.channel || "",
          leads: data.leads?.toString() || "",
          marketingQualifiedLeads: data.marketingQualifiedLeads?.toString() || "",
          salesQualifiedLeads: data.salesQualifiedLeads?.toString() || "",
          conversions: data.conversions?.toString() || "",
          spend: data.spend?.toString() || "",
          team: teams.includes(data.team) ? data.team : "Custom",
          customTeam: teams.includes(data.team) ? "" : data.team || "",
          project: data.project || "",
          account: data.account || "",
        });
        setEditData({ ...data, collection: "leads" });
      } else {
        resetLeadForm();
        setEditData(null);
      }
      setOpenLeadDialog(true);
    } else {
      if (data) {
        setCampaignForm({
          name: data.name || "",
          type: data.type || "",
          cost: data.cost?.toString() || "",
          revenue: data.revenue?.toString() || "",
          clickThroughRate: data.clickThroughRate?.toString() || "",
          likes: data.likes?.toString() || "",
          impressions: data.impressions?.toString() || "",
          team: teams.includes(data.team) ? data.team : "Custom",
          customTeam: teams.includes(data.team) ? "" : data.team || "",
          project: data.project || "",
          account: data.account || "",
        });
        setEditData({ ...data, collection: "campaigns" });
      } else {
        resetCampaignForm();
        setEditData(null);
      }
      setOpenCampaignDialog(true);
    }
  };

  const handleDialogClose = (type) => {
    if (type === "lead") {
      resetLeadForm();
      setOpenLeadDialog(false);
    } else {
      resetCampaignForm();
      setOpenCampaignDialog(false);
    }
    setEditData(null);
  };

  const handleSubmitLead = async () => {
    try {
      const leadData = {
        ...leadForm,
        leads: Number(leadForm.leads) || 0,
        marketingQualifiedLeads: Number(leadForm.marketingQualifiedLeads) || 0,
        salesQualifiedLeads: Number(leadForm.salesQualifiedLeads) || 0,
        conversions: Number(leadForm.conversions) || 0,
        spend: Number(leadForm.spend) || 0,
        team: leadForm.team === "Custom" ? leadForm.customTeam : leadForm.team || "All",
        project: leadForm.project || "N/A",
        account: leadForm.account || "N/A",
        createdAt: new Date(),
      };
      if (editData) {
        await updateDoc(doc(db, "leads", editData.id), leadData);
      } else {
        await addDoc(collection(db, "leads"), leadData);
      }
      await fetchMarketingData();
      handleDialogClose("lead");
    } catch (error) {
      console.error("Error saving lead:", error);
      setError("Failed to save lead");
    }
  };

  const handleSubmitCampaign = async () => {
    try {
      const campaignData = {
        ...campaignForm,
        cost: Number(campaignForm.cost) || 0,
        revenue: Number(campaignForm.revenue) || 0,
        clickThroughRate: Number(campaignForm.clickThroughRate) || 0,
        likes: Number(campaignForm.likes) || 0,
        impressions: Number(campaignForm.impressions) || 0,
        team: campaignForm.team === "Custom" ? campaignForm.customTeam : campaignForm.team || "All",
        project: campaignForm.project || "N/A",
        account: campaignForm.account || "N/A",
        createdAt: new Date(),
      };
      if (editData) {
        await updateDoc(doc(db, "campaigns", editData.id), campaignData);
      } else {
        await addDoc(collection(db, "campaigns"), campaignData);
      }
      await fetchMarketingData();
      handleDialogClose("campaign");
    } catch (error) {
      console.error("Error saving campaign:", error);
      setError("Failed to save campaign");
    }
  };

  const handleDelete = (data) => {
    setDeleteItem(data);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    try {
      await deleteDoc(doc(db, deleteItem.type === "lead" ? "leads" : "campaigns", deleteItem.id));
      await fetchMarketingData();
      setConfirmDeleteOpen(false);
      setDeleteItem(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      setError("Failed to delete item");
    }
  };

  const resetLeadForm = () => {
    setLeadForm({
      channel: "",
      leads: "",
      marketingQualifiedLeads: "",
      salesQualifiedLeads: "",
      conversions: "",
      spend: "",
      team: "",
      customTeam: "",
      project: "",
      account: "",
    });
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: "",
      type: "",
      cost: "",
      revenue: "",
      clickThroughRate: "",
      likes: "",
      impressions: "",
      team: "",
      customTeam: "",
      project: "",
      account: "",
    });
  };

  const handleDateFilterApply = () => {
    setOpenDateFilterDialog(false);
  };

  const handleDateFilterReset = () => {
    setDateRange({ startDate: null, endDate: null });
    setOpenDateFilterDialog(false);
  };

  const renderMarketingCard = (data) => (
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
        }}
      >
        <CardContent>
          <Grid container spacing={2}>
            {data.type === "lead" ? (
              <>
                <Grid item xs={12} sm={6}>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Channel:</strong> {data.channel || "N/A"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Leads:</strong> {data.leads || 0}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Marketing Qualified Leads (MQLs):</strong>{" "}
                    {data.marketingQualifiedLeads || 0}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Sales Qualified Leads (SQLs):</strong> {data.salesQualifiedLeads || 0}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Conversions:</strong> {data.conversions || 0}
                  </MDTypography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Spend:</strong> ${data.spend || 0}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Team:</strong> {data.team || "All"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Project:</strong> {data.project || "N/A"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Account:</strong> {data.account || "N/A"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>
                      Marketing Qualified Leads (MQLs) → Sales Qualified Leads (SQLs):
                    </strong>{" "}
                    {data.marketingQualifiedLeads
                      ? `${Math.round(
                          (data.salesQualifiedLeads / data.marketingQualifiedLeads) * 100
                        )}%`
                      : "0%"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Cost Per Lead (CPL):</strong>{" "}
                    {data.leads ? `$${Math.round(data.spend / data.leads)}` : "$0"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Conversion Rate:</strong>{" "}
                    {data.leads ? `${Math.round((data.conversions / data.leads) * 100)}%` : "0%"}
                  </MDTypography>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} sm={6}>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Name:</strong> {data.name || "N/A"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Type:</strong> {data.type || "N/A"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Cost:</strong> ${data.cost || 0}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Revenue:</strong> ${data.revenue || 0}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Click-Through Rate (CTR):</strong> {data.clickThroughRate || 0}%
                  </MDTypography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Likes:</strong> {data.likes || 0}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Impressions:</strong> {data.impressions || 0}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Team:</strong> {data.team || "All"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Project:</strong> {data.project || "N/A"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>Account:</strong> {data.account || "N/A"}
                  </MDTypography>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    <strong>ROI:</strong>{" "}
                    {data.cost
                      ? `${Math.round(((data.revenue - data.cost) / data.cost) * 100)}%`
                      : "0%"}
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
      </Card>
    </Grid>
  );

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
                    Marketing Management
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
                          onClick={() => handleDialogOpen("lead")}
                        >
                          Add Lead
                        </MDButton>
                        <MDButton
                          variant="gradient"
                          color={darkMode ? "dark" : "info"}
                          onClick={() => handleDialogOpen("campaign")}
                        >
                          Add Campaign
                        </MDButton>
                      </>
                    )}
                    <TextField
                      label="Search by Channel/Name"
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
                      <IconButton onClick={fetchMarketingData}>
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
                <Grid container spacing={3} sx={{ padding: "16px" }}>
                  {error && (
                    <MDTypography color="error" mb={2}>
                      {error}
                    </MDTypography>
                  )}
                  {filteredMarketingData.length === 0 ? (
                    <MDTypography color={darkMode ? "white" : "textPrimary"}>
                      No data available
                    </MDTypography>
                  ) : (
                    filteredMarketingData.map(renderMarketingCard)
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
            {/* Lead Dialog */}
            <Dialog
              open={openLeadDialog}
              onClose={() => handleDialogClose("lead")}
              maxWidth="md"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                {editData ? "Edit Lead" : "Add Lead"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <LeadForm
                  leadForm={leadForm}
                  setLeadForm={setLeadForm}
                  channels={channels}
                  teams={teams}
                  projects={projects}
                  accounts={accounts}
                  darkMode={darkMode}
                />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => handleDialogClose("lead")}
                  sx={{ color: darkMode ? "white" : "black" }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitLead} color="primary">
                  {editData ? "Update Lead" : "Save Lead"}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Campaign Dialog */}
            <Dialog
              open={openCampaignDialog}
              onClose={() => handleDialogClose("campaign")}
              maxWidth="md"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  backgroundColor: darkMode ? "background.default" : "background.paper",
                },
              }}
            >
              <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
                {editData ? "Edit Campaign" : "Add Campaign"}
              </DialogTitle>
              <DialogContent sx={{ py: 2 }}>
                <CampaignForm
                  campaignForm={campaignForm}
                  setCampaignForm={setCampaignForm}
                  campaignTypes={campaignTypes}
                  teams={teams}
                  projects={projects}
                  accounts={accounts}
                  darkMode={darkMode}
                />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => handleDialogClose("campaign")}
                  sx={{ color: darkMode ? "white" : "black" }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitCampaign} color="primary">
                  {editData ? "Update Campaign" : "Save Campaign"}
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
                Want to delete {deleteItem?.type === "lead" ? "lead" : "campaign"}?
              </DialogTitle>
              <DialogActions>
                <Button
                  onClick={() => setConfirmDeleteOpen(false)}
                  sx={{ color: darkMode ? "white" : "black" }}
                >
                  Cancel
                </Button>
                <Button onClick={handleDeleteConfirm} color="error">
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

// LeadForm Component
const LeadForm = ({ leadForm, setLeadForm, channels, teams, projects, accounts, darkMode }) => {
  return (
    <Grid container spacing={2} sx={{ pt: 2 }}>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Channel"
          value={leadForm.channel}
          onChange={(e) => setLeadForm({ ...leadForm, channel: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {channels.map((channel) => (
            <MenuItem key={channel} value={channel}>
              {channel}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Leads"
          type="number"
          value={leadForm.leads}
          onChange={(e) => setLeadForm({ ...leadForm, leads: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Marketing Qualified Leads (MQLs)"
          type="number"
          value={leadForm.marketingQualifiedLeads}
          onChange={(e) => setLeadForm({ ...leadForm, marketingQualifiedLeads: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Sales Qualified Leads (SQLs)"
          type="number"
          value={leadForm.salesQualifiedLeads}
          onChange={(e) => setLeadForm({ ...leadForm, salesQualifiedLeads: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Conversions"
          type="number"
          value={leadForm.conversions}
          onChange={(e) => setLeadForm({ ...leadForm, conversions: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Spend"
          type="number"
          value={leadForm.spend}
          onChange={(e) => setLeadForm({ ...leadForm, spend: e.target.value })}
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
          label="Team"
          value={leadForm.team}
          onChange={(e) => setLeadForm({ ...leadForm, team: e.target.value, customTeam: "" })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {teams.map((team) => (
            <MenuItem key={team} value={team}>
              {team}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {leadForm.team === "Custom" && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Custom Team Name"
            value={leadForm.customTeam}
            onChange={(e) => setLeadForm({ ...leadForm, customTeam: e.target.value })}
            sx={{
              "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
              "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            }}
          />
        </Grid>
      )}
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Project"
          value={leadForm.project}
          onChange={(e) => setLeadForm({ ...leadForm, project: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.name}>
              {project.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Account"
          value={leadForm.account}
          onChange={(e) => setLeadForm({ ...leadForm, account: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.name}>
              {account.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  );
};

// CampaignForm Component
const CampaignForm = ({
  campaignForm,
  setCampaignForm,
  campaignTypes,
  teams,
  projects,
  accounts,
  darkMode,
}) => {
  return (
    <Grid container spacing={2} sx={{ pt: 2 }}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Campaign Name"
          value={campaignForm.name}
          onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
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
          label="Campaign Type"
          value={campaignForm.type}
          onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {campaignTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Cost"
          type="number"
          value={campaignForm.cost}
          onChange={(e) => setCampaignForm({ ...campaignForm, cost: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Revenue"
          type="number"
          value={campaignForm.revenue}
          onChange={(e) => setCampaignForm({ ...campaignForm, revenue: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Click-Through Rate (CTR)"
          type="number"
          value={campaignForm.clickThroughRate}
          onChange={(e) => setCampaignForm({ ...campaignForm, clickThroughRate: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Likes"
          type="number"
          value={campaignForm.likes}
          onChange={(e) => setCampaignForm({ ...campaignForm, likes: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Impressions"
          type="number"
          value={campaignForm.impressions}
          onChange={(e) => setCampaignForm({ ...campaignForm, impressions: e.target.value })}
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
          label="Team"
          value={campaignForm.team}
          onChange={(e) =>
            setCampaignForm({ ...campaignForm, team: e.target.value, customTeam: "" })
          }
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {teams.map((team) => (
            <MenuItem key={team} value={team}>
              {team}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {campaignForm.team === "Custom" && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Custom Team Name"
            value={campaignForm.customTeam}
            onChange={(e) => setCampaignForm({ ...campaignForm, customTeam: e.target.value })}
            sx={{
              "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
              "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            }}
          />
        </Grid>
      )}
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Project"
          value={campaignForm.project}
          onChange={(e) => setCampaignForm({ ...campaignForm, project: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.name}>
              {project.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Account"
          value={campaignForm.account}
          onChange={(e) => setCampaignForm({ ...campaignForm, account: e.target.value })}
          sx={{
            "& .MuiInputBase-input": { color: darkMode ? "white" : "black" },
            "& .MuiInputLabel-root": { color: darkMode ? "white" : "black" },
            "& .MuiMenu-paper": {
              backgroundColor: darkMode ? "#424242" : "white",
              color: darkMode ? "white" : "black",
            },
          }}
        >
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.name}>
              {account.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  );
};

// PropTypes
ManageMarketing.propTypes = {};

LeadForm.propTypes = {
  leadForm: PropTypes.shape({
    channel: PropTypes.string.isRequired,
    leads: PropTypes.string.isRequired,
    marketingQualifiedLeads: PropTypes.string.isRequired,
    salesQualifiedLeads: PropTypes.string.isRequired,
    conversions: PropTypes.string.isRequired,
    spend: PropTypes.string.isRequired,
    team: PropTypes.string.isRequired,
    customTeam: PropTypes.string.isRequired,
    project: PropTypes.string.isRequired,
    account: PropTypes.string.isRequired,
  }).isRequired,
  setLeadForm: PropTypes.func.isRequired,
  channels: PropTypes.arrayOf(PropTypes.string).isRequired,
  teams: PropTypes.arrayOf(PropTypes.string).isRequired,
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

CampaignForm.propTypes = {
  campaignForm: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    cost: PropTypes.string.isRequired,
    revenue: PropTypes.string.isRequired,
    clickThroughRate: PropTypes.string.isRequired,
    likes: PropTypes.string.isRequired,
    impressions: PropTypes.string.isRequired,
    team: PropTypes.string.isRequired,
    customTeam: PropTypes.string.isRequired,
    project: PropTypes.string.isRequired,
    account: PropTypes.string.isRequired,
  }).isRequired,
  setCampaignForm: PropTypes.func.isRequired,
  campaignTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
  teams: PropTypes.arrayOf(PropTypes.string).isRequired,
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

export default ManageMarketing;

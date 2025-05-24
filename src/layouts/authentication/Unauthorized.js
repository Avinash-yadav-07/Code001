import { Grid, Typography, Button } from "@mui/material";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useNavigate } from "react-router-dom";

function Unauthorized() {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={8} mt={8}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={8}>
            <MDBox
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              minHeight="50vh"
              textAlign="center"
              p={3}
              sx={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Typography variant="h1" color="error" gutterBottom>
                403
              </Typography>
              <Typography variant="h4" color="text.primary" gutterBottom>
                Unauthorized Access
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={4}>
                You don't have permission to access this page. Please log in with appropriate
                credentials or contact your administrator.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleLoginRedirect}
              >
                Go to Dashboard
              </Button>
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Unauthorized;

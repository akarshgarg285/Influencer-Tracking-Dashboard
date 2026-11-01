
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Box, Button, Card, CardContent, Container, CssBaseline,
  FormControl, Grid, InputLabel, MenuItem, Modal, Select,
  Typography, createTheme, ThemeProvider, Paper, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Tooltip as MuiTooltip, IconButton,
  Checkbox, ListItemText, Chip, Divider, Collapse
} from '@mui/material';
import {
  BarChart, Bar as RechartsBar, XAxis as RechartsXAxis, YAxis as RechartsYAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { read, utils } from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Icons
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import InsightsIcon from '@mui/icons-material/Insights';
import InventoryIcon from '@mui/icons-material/Inventory';
import CampaignIcon from '@mui/icons-material/Campaign';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AddchartIcon from '@mui/icons-material/Addchart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// MUI Typography augmentation
declare module '@mui/material/styles' {
  interface TypographyVariants {
    code: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    code?: React.CSSProperties;
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    code: true;
  }
}

// A workaround for a known issue with recharts and React 18 types
const Bar = RechartsBar as any;
const XAxis = RechartsXAxis as any;
const YAxis = RechartsYAxis as any;


// === DATA INTERFACES ===
interface Influencer {
  ID: number;
  Name: string;
  Category: string;
  Gender: string;
  Follower_Count: number;
  Platform: string;
}
interface Post {
  Influencer_ID: number;
  Platform: string;
  Date: string;
  URL: string;
  Caption: string;
  Reach: number;
  Likes: number;
  Comments: number;
}
interface TrackingData {
  Influencer_ID: number;
  Campaign: string;
  Product: string;
  Orders: number;
  Revenue: number;
  Source: string;
  User_ID: string;
  Date: string;
}
interface Payout {
  Influencer_ID: number;
  Basis: string;
  Rate: number;
  Orders: number;
  Total_Payout: number;
}
interface EnrichedData {
  Influencer_ID: number;
  Name: string;
  Category: string;
  Platform: string;
  Product: string;
  Campaign: string;
  Orders: number;
  Revenue: number;
  TotalPayout: number;
  TotalLikes: number;
  TotalComments: number;
  ROAS: number;
  EngagementRate: number;
}
interface InfluencerTableRow {
  name: string;
  platform: string;
  orders: number;
  revenue: number;
  payout: number;
  engagementRate: number;
  roas: number;
}
interface InfluencerPerfAgg {
    name: string;
    revenue: number;
    roas: number;
    engagementRate: number;
    payout: number;
}
interface ChartCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  total?: number;
  average?: number;
  totalFormatter?: (value: number) => string;
  avgFormatter?: (value: number) => string;
}
interface CustomChartConfig {
  id: string;
  dimension: keyof EnrichedData;
  metric: keyof EnrichedData;
  aggregation: 'sum' | 'avg';
}

// === THEME AND STYLES ===
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4338CA' }, // Indigo
    secondary: { main: '#10B981' }, // Green
    background: { default: '#F8F9FB', paper: '#FFFFFF' },
    text: { primary: '#111827', secondary: '#6B7280' },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { color: '#6B7280' },
    code: {
        backgroundColor: '#E5E7EB',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '0.9em',
        fontFamily: 'monospace',
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #E5E7EB',
        }
      }
    },
    MuiSelect: {
        styleOverrides: {
            root: {
                borderRadius: 8,
            }
        }
    }
  }
});

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 500,
  bgcolor: 'background.paper',
  border: '1px solid #E5E7EB',
  boxShadow: 24,
  p: 4,
  borderRadius: 3,
};

// === HELPER FUNCTIONS ===
const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
const formatROAS = (value: number) => `${value.toFixed(2)}x`;
const formatCompactCurrency = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value);

// === CONSTANTS FOR CUSTOM CHART BUILDER ===
const DIMENSION_OPTIONS: { value: keyof EnrichedData; label: string }[] = [
    { value: 'Platform', label: 'Platform' },
    { value: 'Category', label: 'Category' },
    { value: 'Product', label: 'Product' },
    { value: 'Campaign', label: 'Campaign' },
    { value: 'Name', label: 'Influencer Name' },
];

const METRIC_OPTIONS: { value: keyof EnrichedData; label: string; formatter: (v: number) => string }[] = [
    { value: 'Revenue', label: 'Revenue', formatter: formatCurrency },
    { value: 'Orders', label: 'Orders', formatter: formatNumber },
    { value: 'TotalPayout', label: 'Payout', formatter: formatCurrency },
    { value: 'ROAS', label: 'ROAS', formatter: formatROAS },
    { value: 'EngagementRate', label: 'Engagement Rate', formatter: (v) => v.toFixed(2) },
    { value: 'TotalLikes', label: 'Likes', formatter: formatNumber },
    { value: 'TotalComments', label: 'Comments', formatter: formatNumber },
];

const AGGREGATION_OPTIONS = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
];

// === SAMPLE DATA GENERATION ===
const sampleInfluencersRaw: Influencer[] = [
  { ID: 1, Name: "Erin Hunt", Category: "Food", Gender: "Female", Follower_Count: 220242, Platform: "Twitter" },
  { ID: 2, Name: "Todd Robb", Category: "Tech", Gender: "Male", Follower_Count: 184979, Platform: "YouTube" },
  { ID: 3, Name: "Chad Lawrence", Category: "Lifestyle", Gender: "Male", Follower_Count: 23705, Platform: "Twitter" },
  { ID: 4, Name: "Jerry Rome", Category: "Beauty", Gender: "Male", Follower_Count: 271136, Platform: "Twitter" },
  { ID: 5, Name: "Carlos Adal", Category: "Tech", Gender: "Female", Follower_Count: 203992, Platform: "Facebook" },
  { ID: 6, Name: "Daniel Nelson", Category: "Beauty", Gender: "Male", Follower_Count: 44487, Platform: "Facebook" },
  { ID: 7, Name: "Kimberly James", Category: "Tech", Gender: "Female", Follower_Count: 80550, Platform: "Twitter" },
  { ID: 8, Name: "Taylor Johnson", Category: "Beauty", Gender: "Male", Follower_Count: 285460, Platform: "Twitter" },
  { ID: 9, Name: "Lynn Cooper", Category: "Beauty", Gender: "Male", Follower_Count: 102767, Platform: "Facebook" },
  { ID: 10, Name: "Timothy Reed", Category: "Beauty", Gender: "Female", Follower_Count: 38312, Platform: "YouTube" },
  { ID: 11, Name: "Sandra Shield", Category: "Fitness", Gender: "Female", Follower_Count: 106593, Platform: "Twitter" },
  { ID: 12, Name: "Donald Cox", Category: "Food", Gender: "Male", Follower_Count: 97003, Platform: "Instagram" },
  { ID: 13, Name: "Mark Rodriguez", Category: "Lifestyle", Gender: "Female", Follower_Count: 155634, Platform: "Instagram" },
  { ID: 14, Name: "Jennifer Sire", Category: "Lifestyle", Gender: "Male", Follower_Count: 55621, Platform: "YouTube" },
  { ID: 15, Name: "Dylan Vale", Category: "Beauty", Gender: "Male", Follower_Count: 47998, Platform: "Instagram" },
  { ID: 16, Name: "Robert Rivera", Category: "Food", Gender: "Male", Follower_Count: 28576, Platform: "Instagram" },
  { ID: 17, Name: "Andrew Ho", Category: "Food", Gender: "Male", Follower_Count: 29741, Platform: "Instagram" },
  { ID: 18, Name: "John Williams", Category: "Food", Gender: "Female", Follower_Count: 63669, Platform: "Facebook" },
  { ID: 19, Name: "Gregory Cc", Category: "Lifestyle", Gender: "Female", Follower_Count: 23136, Platform: "Twitter" },
  { ID: 20, Name: "Misty Bates", Category: "Fitness", Gender: "Female", Follower_Count: 259474, Platform: "Twitter" },
  { ID: 21, Name: "Nichole Vance", Category: "Food", Gender: "Male", Follower_Count: 261546, Platform: "Twitter" },
  { ID: 22, Name: "Vanessa Pena", Category: "Beauty", Gender: "Female", Follower_Count: 43454, Platform: "YouTube" },
  { ID: 23, Name: "Timothy Blue", Category: "Food", Gender: "Female", Follower_Count: 286638, Platform: "Twitter" },
  { ID: 24, Name: "Robert Riddle", Category: "Beauty", Gender: "Female", Follower_Count: 203517, Platform: "YouTube" },
  { ID: 25, Name: "Brian Hernandez", Category: "Tech", Gender: "Male", Follower_Count: 117836, Platform: "Instagram" },
];

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const samplePosts: Post[] = sampleInfluencersRaw.flatMap((influencer, idx) => {
    const numPosts = Math.floor(randomBetween(1, 4));
    return Array.from({ length: numPosts }, (_, i) => ({
        Influencer_ID: influencer.ID,
        Platform: influencer.Platform,
        Date: new Date(Date.now() - randomBetween(1, 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        URL: `https://fakeplatform.com/post/${influencer.ID}/${idx * 10 + i}`,
        Caption: `Loving the new products for ${influencer.Category}! #ad #${influencer.Category.toLowerCase()}`,
        Reach: Math.floor(influencer.Follower_Count * randomBetween(0.2, 0.8)),
        Likes: Math.floor(influencer.Follower_Count * randomBetween(0.01, 0.08)),
        Comments: Math.floor(influencer.Follower_Count * randomBetween(0.001, 0.009)),
    }));
});

const campaigns = ['Summer Sale', 'Winter Clearout', 'Spring Refresh'];
const products: Record<string, string[]> = {
    Food: ['Gourmet Box', 'Healthy Snacks'],
    Tech: ['Gadget Pro X', 'Smart Home Hub'],
    Lifestyle: ['Travel Pack', 'Urban Explorer Kit'],
    Beauty: ['Skincare Set', 'Makeup Essentials'],
    Fitness: ['Pro-Fit Tracker', 'Yoga Mat'],
};

const sampleTrackingData: TrackingData[] = sampleInfluencersRaw.map(influencer => {
    const productList = products[influencer.Category] || [];
    const product = productList[Math.floor(randomBetween(0, productList.length))];
    const campaign = campaigns[Math.floor(randomBetween(0, campaigns.length))];
    const orders = Math.floor(influencer.Follower_Count / randomBetween(500, 2000));
    const revenue = orders * randomBetween(50, 300);
    return {
        Influencer_ID: influencer.ID,
        Campaign: campaign,
        Product: product,
        Orders: orders,
        Revenue: revenue,
        Source: influencer.Platform,
        User_ID: `user_${Math.floor(randomBetween(1000, 9999))}`,
        Date: new Date(Date.now() - randomBetween(1, 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
});

const samplePayouts: Payout[] = sampleInfluencersRaw.map(influencer => {
    const basis = Math.random() > 0.5 ? 'Post' : 'Order';
    const rate = basis === 'Post' ? randomBetween(500, 2000) : randomBetween(10, 50); // rate per order
    const influencerTrackingData = sampleTrackingData.find(d => d.Influencer_ID === influencer.ID);
    const orders = influencerTrackingData ? influencerTrackingData.Orders : 0;
    const total_payout = basis === 'Post' ? rate : rate * orders;
    return {
        Influencer_ID: influencer.ID,
        Basis: basis,
        Rate: Math.round(rate),
        Orders: orders,
        Total_Payout: Math.round(total_payout),
    };
});

const sampleInfluencers: Influencer[] = sampleInfluencersRaw;


// === DATA PROCESSING LOGIC ===
const processDataFromObjects = (
  influencers: Influencer[],
  posts: Post[],
  trackingData: TrackingData[],
  payouts: Payout[]
) => {
  const influencersMap = new Map(influencers.map(i => [i.ID, i]));
  const postsAgg = posts.reduce((acc, post) => {
    const id = post.Influencer_ID;
    if (!acc.has(id)) acc.set(id, { totalLikes: 0, totalComments: 0 });
    const current = acc.get(id)!;
    current.totalLikes += Number(post.Likes) || 0;
    current.totalComments += Number(post.Comments) || 0;
    return acc;
  }, new Map<number, { totalLikes: number; totalComments: number; }>());
  const payoutsAgg = payouts.reduce((acc, p) => {
    const id = p.Influencer_ID;
    if (!acc.has(id)) acc.set(id, { totalPayout: 0 });
    acc.get(id)!.totalPayout += Number(p.Total_Payout) || 0;
    return acc;
  }, new Map<number, { totalPayout: number }>());

  const enrichedData = trackingData.map(track => {
    const influencer = influencersMap.get(track.Influencer_ID) || { Name: 'Unknown', Category: 'Unknown' };
    const postStats = postsAgg.get(track.Influencer_ID) || { totalLikes: 0, totalComments: 0 };
    const payoutInfo = payoutsAgg.get(track.Influencer_ID) || { totalPayout: 0 };
    const revenue = Number(track.Revenue) || 0;
    const { totalPayout } = payoutInfo;
    const { totalLikes, totalComments } = postStats;
    const roas = totalPayout > 0 ? revenue / totalPayout : 0;
    const engagementRate = totalPayout > 0 ? (totalLikes + totalComments) / totalPayout : 0;
    return { ...track, Platform: track.Source || "Unknown", Name: influencer.Name, Category: influencer.Category, Orders: Number(track.Orders) || 0, Revenue: revenue, TotalPayout: totalPayout, TotalLikes: totalLikes, TotalComments: totalComments, ROAS: roas, EngagementRate: engagementRate };
  });

  return { enrichedData, rawData: { influencers, posts, trackingData, payouts } };
};

const processUploadedFile = (fileBuffer: ArrayBuffer) => {
  const workbook = read(fileBuffer, { type: 'array' });
  const getSheetData = (sheetName: string): any[] => {
    if (!workbook.Sheets[sheetName]) throw new Error(`Sheet "${sheetName}" not found.`);
    return utils.sheet_to_json(workbook.Sheets[sheetName]);
  }
  const influencers = getSheetData('influencers') as Influencer[];
  const posts = getSheetData('posts') as Post[];
  const trackingData = getSheetData('tracking_data') as TrackingData[];
  const payouts = getSheetData('payouts') as Payout[];

  return processDataFromObjects(influencers, posts, trackingData, payouts);
};

const calculateSpend = (
  filters: { category: string[]; platform: string[]; product: string[]; campaign: string[] },
  influencers: Influencer[],
  trackingData: TrackingData[],
  payouts: Payout[]
): number => {
  let totalSpend = 0;
  const noFilters = filters.category.length === 0 && filters.platform.length === 0 && filters.product.length === 0 && filters.campaign.length === 0;

  if (noFilters && payouts.length > 0) {
      totalSpend = payouts.reduce((sum, p) => sum + Number(p.Total_Payout || 0), 0);
  } else {
      const hasInfluencerFilters = filters.platform.length > 0 || filters.category.length > 0;
      const influencerFilterIds = new Set<number>();
      if (hasInfluencerFilters) {
          influencers.forEach(inf => {
              const platformMatch = filters.platform.length === 0 || filters.platform.includes(inf.Platform);
              const categoryMatch = filters.category.length === 0 || filters.category.includes(inf.Category);
              if (platformMatch && categoryMatch) {
                  influencerFilterIds.add(inf.ID);
              }
          });
      }
      
      const hasTrackingFilters = filters.product.length > 0 || filters.campaign.length > 0;
      const trackingFilterIds = new Set<number>();
      if (hasTrackingFilters) {
          trackingData.forEach(track => {
              const productMatch = filters.product.length === 0 || filters.product.includes(track.Product);
              const campaignMatch = filters.campaign.length === 0 || filters.campaign.includes(track.Campaign);
              if (productMatch && campaignMatch) {
                  trackingFilterIds.add(track.Influencer_ID);
              }
          });
      }
      
      let finalIds: Set<number>;
      if (hasInfluencerFilters && hasTrackingFilters) {
          finalIds = new Set([...influencerFilterIds].filter(id => trackingFilterIds.has(id)));
      } else if (hasInfluencerFilters) {
          finalIds = influencerFilterIds;
      } else { // hasTrackingFilters must be true here, or no filters are applied in this branch
          finalIds = trackingFilterIds;
      }

      if (finalIds && finalIds.size > 0) {
        totalSpend = payouts.reduce((sum, p) => {
            if (finalIds.has(p.Influencer_ID)) {
                return sum + Number(p.Total_Payout || 0);
            }
            return sum;
        }, 0);
      }
  }
  return totalSpend;
};

// === REACT COMPONENTS ===

const KpiCard = ({ title, value, icon, color, ghostIcon }) => (
  <Card sx={{ position: 'relative', overflow: 'hidden', borderTop: `4px solid ${color}` }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ mr: 1.5, color }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary' }}>{title}</Typography>
      </Box>
      <Typography variant="h4">{value}</Typography>
      <Box sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: '100px', color, opacity: 0.1 }}>
        {ghostIcon}
      </Box>
    </CardContent>
  </Card>
);

const CustomTooltipContent = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
        const data = payload[0];
        const metricInfo = METRIC_OPTIONS.find(m => m.value.toLowerCase() === String(data.dataKey).toLowerCase());
        
        const formatter = (value) => {
            if (metricInfo) return metricInfo.formatter(value);

            // Fallback for keys not in METRIC_OPTIONS (like the original hardcoded charts)
            const dataKey = String(data.dataKey).toLowerCase();
            if (dataKey === 'revenue') return formatCurrency(value);
            if (dataKey === 'roas') return formatROAS(value);
            return formatNumber(value);
        };
        return (
            <Paper elevation={3} sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: data.fill }}>{`${data.name}: ${formatter(data.value)}`}</Typography>
            </Paper>
        );
    }
    return null;
};
const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, icon, children, total, average, totalFormatter, avgFormatter }) => (
    <Card sx={{ minWidth: 500, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
                <Box>
                    <Typography variant="h6">{title}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">{subtitle}</Typography>
                </Box>
            </Box>
            <Box sx={{ flexGrow: 1, minHeight: '350px' }}>{children}</Box>
            {(total !== undefined && average !== undefined && totalFormatter && avgFormatter) && (
              <Box sx={{ mt: 2, borderTop: '1px solid #E5E7EB', pt: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Total:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalFormatter(total)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Average:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{avgFormatter(average)}</Typography>
                  </Box>
              </Box>
            )}
        </CardContent>
    </Card>
);

const tableHeadCells: { id: keyof InfluencerTableRow; label: string; }[] = [
    { id: 'name', label: 'Influencer' },
    { id: 'platform', label: 'Platform' },
    { id: 'orders', label: 'Orders' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'payout', label: 'Payout' },
    { id: 'roas', label: 'ROAS' },
    { id: 'engagementRate', label: 'Engagement Rate' },
];

const InfluencerPerformanceTable = ({ data, onExport }) => {
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState<keyof InfluencerTableRow>('revenue');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const handleRequestSort = (property: keyof InfluencerTableRow) => {
        setOrder(orderBy === property && order === 'asc' ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const valA = a[orderBy];
            const valB = b[orderBy];
            if (typeof valA === 'number' && typeof valB === 'number') {
                return order === 'asc' ? valA - valB : valB - valA;
            }
            return order === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        });
    }, [data, order, orderBy]);

    const paginatedData = useMemo(() => sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [sortedData, page, rowsPerPage]);

    return (
        <Card sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="h5">Influencer Performance</Typography>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onExport} disabled={data.length === 0}>Export</Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            {tableHeadCells.map(headCell => (
                                <TableCell key={headCell.id} sortDirection={orderBy === headCell.id ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === headCell.id}
                                        direction={orderBy === headCell.id ? order : 'asc'}
                                        onClick={() => handleRequestSort(headCell.id)}
                                    >
                                        {headCell.label}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedData.length > 0 ? paginatedData.map((row, index) => (
                            <TableRow key={`${row.name}-${index}`} hover>
                                <TableCell>{row.name}</TableCell><TableCell>{row.platform}</TableCell>
                                <TableCell>{formatNumber(row.orders)}</TableCell><TableCell>{formatCurrency(row.revenue)}</TableCell>
                                <TableCell>{formatCurrency(row.payout)}</TableCell>
                                <TableCell sx={{ color: row.roas < 1 ? '#F87171' : '#34D399', fontWeight: 'bold' }}>{formatROAS(row.roas)}</TableCell>
                                <TableCell>{row.engagementRate.toFixed(2)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={7} align="center">No data available.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={data.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, newPage) => setPage(newPage)} onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
        </Card>
    );
};

const MultiSelectFilter = ({ label, options, selectedValues, onChange }) => {
  const handleSelect = (event) => {
    const value = event.target.value;
    
    if (value[value.length - 1] === "all") {
      onChange(selectedValues.length === options.length ? [] : options);
      return;
    }
    onChange(value);
  };
  
  const isAllSelected = options.length > 0 && selectedValues.length === options.length;

  return (
    <FormControl sx={{ width: '100%', minWidth: 100 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={selectedValues}
        onChange={handleSelect}
        renderValue={(selected) => {
           if (isAllSelected) {
            return <Chip label="All" size="small" />;
          }
          const sel = selected as string[];
          const toShow = sel.slice(0, 2).map(v => (
           <Chip key={v} label={v} size="small" />
          ));
           if (sel.length > 2) {
      toShow.push(
        <Typography
          key="more"
          variant="body2"
          sx={{ ml: 0.5, lineHeight: '32px', color: 'text.secondary' }}
        >
          …  
        </Typography>
      );
    }

          return <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{toShow}</Box>;
        }}
        label={label}
      >
        <MenuItem value="all">
          <Checkbox
            checked={isAllSelected}
            indeterminate={selectedValues.length > 0 && selectedValues.length < options.length}
          />
          <ListItemText primary="Select All" />
        </MenuItem>
        {options.map(option => (
          <MenuItem key={option} value={option}>
            <Checkbox checked={selectedValues.indexOf(option) > -1} />
            <ListItemText primary={option} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const GeneratedCustomChart = ({ config, data, onDelete }: { config: CustomChartConfig, data: EnrichedData[], onDelete: (id: string) => void }) => {
    const { id, dimension, metric, aggregation } = config;

    const { chartData, chartTitle, selectedMetricInfo } = useMemo(() => {
        const groupedData = data.reduce((acc, item) => {
            const key = String(item[dimension]);
            const value = Number(item[metric]);
            if (isNaN(value)) return acc;

            if (!acc.has(key)) {
                acc.set(key, { sum: 0, count: 0 });
            }
            const current = acc.get(key)!;
            current.sum += value;
            current.count++;
            return acc;
        }, new Map<string, { sum: number; count: number; }>());

        const newChartData = Array.from(groupedData.entries()).map(([name, values]) => {
            const aggregatedValue = aggregation === 'avg'
                ? (values.count > 0 ? values.sum / values.count : 0)
                : values.sum;
            return { name, [metric]: aggregatedValue };
        });

        const sortedChartData = newChartData.sort((a, b) => (b[metric] as number) - (a[metric] as number));

        const aggLabel = AGGREGATION_OPTIONS.find(a => a.value === aggregation)?.label;
        const dimLabel = DIMENSION_OPTIONS.find(d => d.value === dimension)?.label;
        const metLabel = METRIC_OPTIONS.find(m => m.value === metric)?.label;
        const title = `${aggLabel} of ${metLabel} by ${dimLabel}`;
        
        const metricInfo = METRIC_OPTIONS.find(m => m.value === metric);

        return { chartData: sortedChartData, chartTitle: title, selectedMetricInfo: metricInfo };
    }, [config, data]);

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                     <Box sx={{ pr: 2 }}>
                        <Typography variant="h6">{chartTitle}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => onDelete(id)} aria-label={`Delete chart: ${chartTitle}`} sx={{ mt: -1, mr: -1 }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1, minHeight: '350px' }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 65 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={selectedMetricInfo?.formatter || formatNumber} />
                            <RechartsTooltip content={<CustomTooltipContent />} cursor={{ fill: 'rgba(67, 56, 202, 0.1)' }} />
                            <Bar dataKey={metric} name={selectedMetricInfo?.label || ''} fill="#4338CA" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </CardContent>
        </Card>
    );
};

const CustomChartBuilder = ({ onAddChart }: { onAddChart: (config: Omit<CustomChartConfig, 'id'>) => void }) => {
    const [dimension, setDimension] = useState<keyof EnrichedData | ''>('');
    const [metric, setMetric] = useState<keyof EnrichedData | ''>('');
    const [aggregation, setAggregation] = useState<'sum' | 'avg'>('sum');
    const [error, setError] = useState<string | null>(null);
    
    const isRatioMetric = useMemo(() => metric === 'ROAS' || metric === 'EngagementRate', [metric]);

    const handleAddClick = useCallback(() => {
        if (!dimension || !metric) {
            setError('Please select a dimension and a metric.');
            return;
        }
        setError(null);
        
        const effectiveAggregation = isRatioMetric ? 'avg' : aggregation;

        onAddChart({ dimension, metric, aggregation: effectiveAggregation });

        // Reset form for next chart
        setDimension('');
        setMetric('');
        setAggregation('sum');

    }, [dimension, metric, aggregation, isRatioMetric, onAddChart]);

    return (
        <Card sx={{ mt: 4 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AddchartIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Box>
                        <Typography variant="h5">Custom Chart Builder</Typography>
                        <Typography variant="subtitle1" color="text.secondary">Create your own analysis</Typography>
                    </Box>
                </Box>
                <Grid container spacing={2}>
                    <Grid xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Group By (X-Axis)</InputLabel>
                            <Select value={dimension} label="Group By (X-Axis)" onChange={e => setDimension(e.target.value as keyof EnrichedData)}>
                                {DIMENSION_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Metric (Y-Axis)</InputLabel>
                            <Select value={metric} label="Metric (Y-Axis)" onChange={e => setMetric(e.target.value as keyof EnrichedData)}>
                                {METRIC_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid xs={12} md={3}>
                        <FormControl fullWidth disabled={isRatioMetric}>
                            <InputLabel>Aggregation</InputLabel>
                            <Select value={isRatioMetric ? 'avg' : aggregation} label="Aggregation" onChange={e => setAggregation(e.target.value as 'sum' | 'avg')}>
                                {AGGREGATION_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid xs={12} md={3}>
                        <Button variant="contained" onClick={handleAddClick} fullWidth sx={{ height: '100%' }}>
                            Add Chart
                        </Button>
                    </Grid>
                </Grid>
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </CardContent>
        </Card>
    );
};


const App = () => {
  const [allData, setAllData] = useState<EnrichedData[]>([]);
  const [filteredData, setFilteredData] = useState<EnrichedData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [showDataRules, setShowDataRules] = useState(false);
  const [filters, setFilters] = useState({ category: [], platform: [], product: [], campaign: [] });
  const [customCharts, setCustomCharts] = useState<CustomChartConfig[]>([]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Raw data state
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);


  const filterOptions = useMemo(() => ({
    categories: [...new Set(allData.map(d => d.Category))].sort(),
    platforms: [...new Set(allData.map(d => d.Platform))].sort(),
    products: [...new Set(allData.map(d => d.Product))].sort(),
    campaigns: [...new Set(allData.map(d => d.Campaign))].sort(),
  }), [allData]);

  useEffect(() => { setIsModalOpen(allData.length === 0); }, [allData]);

  useEffect(() => {
    const data = allData.filter(d =>
      (filters.category.length === 0 || filters.category.includes(d.Category)) &&
      (filters.platform.length === 0 || filters.platform.includes(d.Platform)) &&
      (filters.product.length === 0 || filters.product.includes(d.Product)) &&
      (filters.campaign.length === 0 || filters.campaign.includes(d.Campaign))
    );
    setFilteredData(data);
  }, [allData, filters]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true); setError(null);
    try {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const { enrichedData, rawData } = processUploadedFile(e.target!.result as ArrayBuffer);
          setAllData(enrichedData);
          setInfluencers(rawData.influencers);
          setTrackingData(rawData.trackingData);
          setPayouts(rawData.payouts);

          setCustomCharts([]); // Reset custom charts on new data upload
          setIsModalOpen(false);
        } catch (err) { setError((err as Error).message); setAllData([]); }
        finally { setIsLoading(false); }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) { setError("Failed to read file."); setIsLoading(false); }
  };
  
  const handleLoadSampleData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // Use a timeout to simulate loading and allow UI to update
    setTimeout(() => {
        try {
            const { enrichedData, rawData } = processDataFromObjects(sampleInfluencers, samplePosts, sampleTrackingData, samplePayouts);

            setAllData(enrichedData);
            setInfluencers(rawData.influencers);
            setTrackingData(rawData.trackingData);
            setPayouts(rawData.payouts);
            setCustomCharts([]); // Reset custom charts
            setIsModalOpen(false);
        } catch(err) {
            setError((err as Error).message);
            setAllData([]);
        } finally {
            setIsLoading(false);
        }
    }, 500); // 500ms delay for visual feedback
  }, []);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: typeof value === 'string' ? value.split(',') : value }));
  };
  
  const handleResetFilters = () => {
    setFilters({ category: [], platform: [], product: [], campaign: [] });
  };
  
  const handleAddChart = useCallback((config: Omit<CustomChartConfig, 'id'>) => {
    const newChart: CustomChartConfig = {
      ...config,
      id: `chart-${Date.now()}-${Math.random()}`,
    };
    setCustomCharts(prev => [...prev, newChart]);
  }, []);

  const handleDeleteChart = useCallback((id: string) => {
      setCustomCharts(prev => prev.filter(chart => chart.id !== id));
  }, []);

  const kpiData = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum: number, d: EnrichedData) => sum + d.Revenue, 0);
    const totalOrders = filteredData.reduce((sum: number, d: EnrichedData) => sum + d.Orders, 0);
    const totalSpend = calculateSpend(filters, influencers, trackingData, payouts);
    const totalRoas = Number(totalSpend) > 0 ? Number(totalRevenue) / Number(totalSpend) : 0;
    
    return { totalRevenue, totalOrders, totalSpend, totalRoas };
  }, [filteredData, filters, influencers, trackingData, payouts]);

  const chartsData = useMemo(() => {
    const aggregateBy = (key: 'Platform' | 'Product' | 'Campaign') => {
      // Step 1: Group revenue and orders from filtered data.
      const groupedData = filteredData.reduce((acc, item) => {
        const groupName = item[key];
        if (!acc.has(groupName)) {
          acc.set(groupName, { revenue: 0, orders: 0 });
        }
        const group = acc.get(groupName)!;
        group.revenue += Number(item.Revenue) || 0;
        group.orders += Number(item.Orders) || 0;
        return acc;
      }, new Map<string, { revenue: number; orders: number; }>());

      // Step 2: For each group, calculate its specific spend and ROAS
      const result = Array.from(groupedData.entries()).map(([name, values]) => {
        const keyLower = key.toLowerCase() as 'platform' | 'product' | 'campaign';
        const groupFilters = {
          ...filters,
          [keyLower]: [name]
        };

        const payout = calculateSpend(groupFilters, influencers, trackingData, payouts);
        
        return {
          name,
          revenue: values.revenue,
          orders: values.orders,
          payout,
          roas: payout > 0 ? values.revenue / payout : 0,
        };
      });

      const total = result.reduce((sum, item) => sum + item.revenue, 0);
      return { data: result, total, average: result.length > 0 ? total / result.length : 0 };
    };

    const influencerPerfMap = new Map<string, InfluencerPerfAgg>();
    for (const item of filteredData) {
        if (!influencerPerfMap.has(item.Name)) {
            influencerPerfMap.set(item.Name, {
                name: item.Name,
                revenue: 0,
                roas: 0, // Will be calculated later
                engagementRate: Number(item.EngagementRate) || 0,
                payout: Number(item.TotalPayout) || 0,
            });
        }
        const current = influencerPerfMap.get(item.Name)!;
        current.revenue += Number(item.Revenue) || 0;
    }

    const influencerPerf = Array.from(influencerPerfMap.values()).map((inf) => {
        const payout = inf.payout;
        const revenue = inf.revenue;
        return {
            ...inf,
            roas: payout > 0 ? revenue / payout : 0,
        };
    });

    return {
      byPlatform: aggregateBy('Platform'),
      byProduct: aggregateBy('Product'),
      byCampaign: aggregateBy('Campaign'),
      influencerPerf
    };
  }, [filteredData, filters, influencers, trackingData, payouts]);
  
  const influencerTableData = useMemo((): InfluencerTableRow[] => {
    const influencerMap = new Map<string, Omit<InfluencerTableRow, 'roas'>>();

    for (const item of filteredData) {
        if (!influencerMap.has(item.Name)) {
            influencerMap.set(item.Name, {
                name: item.Name,
                platform: item.Platform,
                orders: 0,
                revenue: 0,
                payout: Number(item.TotalPayout) || 0,
                engagementRate: Number(item.EngagementRate) || 0,
            });
        }
        const current = influencerMap.get(item.Name)!;
        current.orders += Number(item.Orders) || 0;
        current.revenue += Number(item.Revenue) || 0;
    }

    return Array.from(influencerMap.values()).map((inf) => {
        const payout = inf.payout;
        const revenue = inf.revenue;
        return {
            ...inf,
            roas: payout > 0 ? revenue / payout : 0,
        };
    });
  }, [filteredData]);

  const handleExport = useCallback(() => {
    const csv = Papa.unparse(influencerTableData.map(row => ({ ...row, revenue: row.revenue.toFixed(2), payout: row.payout.toFixed(2), roas: row.roas.toFixed(2), engagementRate: row.engagementRate.toFixed(2) })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'influencer_performance.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [influencerTableData]);

  const handleDownloadPdf = useCallback(async () => {
    const dashboardElement = document.getElementById('dashboard-content');
    if (!dashboardElement) {
        setError('Could not find dashboard content to export.');
        return;
    }

    setIsDownloadingPdf(true);
    setError(null);

    try {
        const canvas = await html2canvas(dashboardElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            // Ensure it captures the full scrollable content
            windowWidth: dashboardElement.scrollWidth,
            windowHeight: dashboardElement.scrollHeight,
        });

        const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait, millimeters, A4
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calculate the height of the canvas that fits on one A4 page, maintaining aspect ratio
        const pageHeightInPixels = (canvasWidth / pdfWidth) * pdfHeight;
        let currentPosition = 0;
        let pageNum = 1;

        // Loop to create multiple pages if content is too long
        while (currentPosition < canvasHeight) {
            // Create a temporary canvas to hold the slice of the main canvas
            const sliceCanvas = document.createElement('canvas');
            const sliceHeight = Math.min(pageHeightInPixels, canvasHeight - currentPosition);
            sliceCanvas.width = canvasWidth;
            sliceCanvas.height = sliceHeight;

            const sliceCtx = sliceCanvas.getContext('2d');
            if (sliceCtx) {
              sliceCtx.drawImage(canvas, 0, currentPosition, canvasWidth, sliceHeight, 0, 0, canvasWidth, sliceHeight);
            }
            
            const sliceDataUrl = sliceCanvas.toDataURL('image/png', 1.0);

            if (pageNum > 1) {
                pdf.addPage();
            }

            // Add the image slice to the PDF page
            pdf.addImage(sliceDataUrl, 'PNG', 0, 0, pdfWidth, (sliceHeight * pdfWidth) / canvasWidth);
            
            currentPosition += pageHeightInPixels;
            pageNum++;
        }

        pdf.save('dashboard-report.pdf');

    } catch (err) {
        console.error(err);
        setError('Failed to generate PDF. Please try again.');
    } finally {
        setIsDownloadingPdf(false);
    }
  }, []);

  const top5Revenue = useMemo(() => [...chartsData.influencerPerf].sort((a, b) => b.revenue - a.revenue).slice(0, 5), [chartsData.influencerPerf]);
  const bottom5Roas = useMemo(() => [...chartsData.influencerPerf].sort((a, b) => a.roas - b.roas).slice(0, 5), [chartsData.influencerPerf]);
  const top5Engagement = useMemo(() => [...chartsData.influencerPerf].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5), [chartsData.influencerPerf]);
  
  const renderDashboard = () => (
    <Container id="dashboard-content" maxWidth={false} sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Grid container spacing={3}>
        {/* KPIs */}
        <Grid xs={12} sm={6} md={3}><KpiCard title="TOTAL ORDERS" value={formatNumber(kpiData.totalOrders)} color="#4338CA" icon={<ShoppingCartOutlinedIcon />} ghostIcon={<ShoppingCartOutlinedIcon />} /></Grid>
        <Grid xs={12} sm={6} md={3}><KpiCard title="TOTAL REVENUE" value={formatCurrency(kpiData.totalRevenue)} color="#10B981" icon={<MonetizationOnIcon />} ghostIcon={<MonetizationOnIcon />} /></Grid>
        <Grid xs={12} sm={6} md={3}><KpiCard title="TOTAL SPEND" value={formatCurrency(kpiData.totalSpend)} color="#A855F7" icon={<PaidOutlinedIcon />} ghostIcon={<PaidOutlinedIcon />} /></Grid>
        <Grid xs={12} sm={6} md={3}><KpiCard title="TOTAL ROAS" value={formatROAS(kpiData.totalRoas)} color="#F97316" icon={<ShowChartIcon />} ghostIcon={<ShowChartIcon />} /></Grid>

        {/* Filters */}
        <Grid xs={12}>
            <Card>
                <CardContent>
                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2}}>
                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                            <FilterListIcon sx={{color: 'primary.main', mr: 1}}/>
                            <Box>
                                <Typography variant="h6">Filters</Typography>
                                <Typography variant="subtitle2" color="text.secondary">Refine your data view</Typography>
                            </Box>
                        </Box>
                        <Button
                            variant="text"
                            startIcon={<RestartAltIcon />}
                            onClick={handleResetFilters}
                            sx={{ color: 'text.secondary' }}
                        >
                            Reset
                        </Button>
                    </Box>
                    <Grid container spacing={2}>
                        <Grid xs={12} sm={6} md={3}>
                            <MultiSelectFilter
                                label="Platform"
                                options={filterOptions.platforms}
                                selectedValues={filters.platform}
                                onChange={(value) => handleFilterChange('platform', value)}
                            />
                        </Grid>
                        <Grid xs={12} sm={6} md={3}>
                           <MultiSelectFilter
                                label="Category"
                                options={filterOptions.categories}
                                selectedValues={filters.category}
                                onChange={(value) => handleFilterChange('category', value)}
                            />
                        </Grid>
                        <Grid xs={12} sm={6} md={3}>
                            <MultiSelectFilter
                                label="Product"
                                options={filterOptions.products}
                                selectedValues={filters.product}
                                onChange={(value) => handleFilterChange('product', value)}
                            />
                        </Grid>
                        <Grid xs={12} sm={6} md={3}>
                            <MultiSelectFilter
                                label="Campaign"
                                options={filterOptions.campaigns}
                                selectedValues={filters.campaign}
                                onChange={(value) => handleFilterChange('campaign', value)}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Grid>
        
        {/* Charts Header */}
         <Grid xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <InsightsIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Box>
                    <Typography variant="h5">Performance Charts</Typography>
                    <Typography variant="subtitle1">Visual insights into your campaign performance</Typography>
                </Box>
            </Box>
        </Grid>

        {/* CHARTS */}
        <Grid xs={12} md={6}>
          <ChartCard title="Revenue by Platform" subtitle="Performance overview" icon={<LeaderboardIcon />} total={chartsData.byPlatform.total} average={chartsData.byPlatform.average} totalFormatter={formatCurrency} avgFormatter={formatCurrency}>
            <ResponsiveContainer>
              <BarChart data={chartsData.byPlatform.data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatCompactCurrency} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid xs={12} md={6}>
          <ChartCard title="ROAS by Platform" subtitle="Performance overview" icon={<ShowChartIcon />}>
            <ResponsiveContainer>
              <BarChart data={chartsData.byPlatform.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatROAS} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Bar dataKey="roas" name="ROAS" fill="#4338CA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid xs={12} md={6}>
          <ChartCard title="Revenue by Product" subtitle="Top performing products" icon={<InventoryIcon />} total={chartsData.byProduct.total} average={chartsData.byProduct.average} totalFormatter={formatCurrency} avgFormatter={formatCurrency}>
            <ResponsiveContainer>
              <BarChart data={chartsData.byProduct.data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatCompactCurrency} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid xs={12} md={6}>
          <ChartCard title="Campaign ROAS" subtitle="Effectiveness of campaigns" icon={<CampaignIcon />}>
            <ResponsiveContainer>
              <BarChart data={chartsData.byCampaign.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatROAS} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Bar dataKey="roas" name="ROAS" fill="#4338CA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid xs={12} md={6}>
          <ChartCard title="Top 5 Influencers by Revenue" subtitle="Highest revenue generators" icon={<TrendingUpIcon />} total={top5Revenue.reduce((s, i) => s + i.revenue, 0)} average={top5Revenue.length > 0 ? top5Revenue.reduce((s, i) => s + i.revenue, 0) / top5Revenue.length : 0} totalFormatter={formatCurrency} avgFormatter={formatCurrency}>
            <ResponsiveContainer>
              <BarChart data={top5Revenue} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatCompactCurrency} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid xs={12} md={6}>
          <ChartCard title="Bottom 5 Influencers by ROAS" subtitle="Lowest performing influencers" icon={<TrendingDownIcon />}>
            <ResponsiveContainer>
              <BarChart data={bottom5Roas} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatROAS} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Bar dataKey="roas" name="ROAS" fill="#F87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        
        {/* TABLE */}
        <Grid xs={12}>
            <InfluencerPerformanceTable data={influencerTableData} onExport={handleExport} />
        </Grid>

        {/* CUSTOM CHART BUILDER */}
        <Grid xs={12}>
            <CustomChartBuilder onAddChart={handleAddChart} />
        </Grid>

        {/* Generated custom charts */}
        {customCharts.map(config => (
            <Grid xs={12} md={6} key={config.id}>
                <GeneratedCustomChart 
                    config={config} 
                    data={filteredData}
                    onDelete={handleDeleteChart}
                />
            </Grid>
        ))}

        {/* PDF Download Button */}
        <Grid xs={12} sx={{ textAlign: 'center', mt: 4, mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={isDownloadingPdf ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? 'Generating PDF...' : 'Download Dashboard as PDF'}
            </Button>
        </Grid>

      </Grid>
    </Container>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Button variant="text" onClick={() => { setIsModalOpen(true); setError(null); }} sx={{position: 'absolute', top: 16, right: 24, zIndex: 1201, color: theme.palette.text.secondary}}>
        {allData.length > 0 ? 'Change Data Source' : 'Load Data'}
      </Button>
      <main>
        <Modal open={isModalOpen} onClose={allData.length > 0 ? () => setIsModalOpen(false) : undefined} aria-labelledby="upload-modal-title">
          <Box sx={modalStyle}>
             <IconButton aria-label="close" onClick={() => setIsModalOpen(false)} disabled={isLoading || allData.length === 0} sx={{ position: 'absolute', right: 8, top: 8, }}>
                <CloseIcon />
            </IconButton>
            <Typography id="upload-modal-title" variant="h6" component="h2">Load Campaign Data</Typography>
            <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>Choose a data source to start your analysis.</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button 
                    variant="contained" 
                    onClick={handleLoadSampleData} 
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LeaderboardIcon />}
                    sx={{ py: 1.5 }}
                >
                    Use Sample Data
                </Button>
                <Divider sx={{ my: 1 }}><Typography variant="body2" color="text.secondary">OR</Typography></Divider>
                <Button 
                    variant="outlined" 
                    component="label" 
                    startIcon={<UploadFileIcon />} 
                    fullWidth
                    disabled={isLoading}
                    sx={{ py: 1.5 }}
                >
                    Upload Your File (.xlsx)
                    <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
                </Button>
                 <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowDataRules(prev => !prev)}
                    sx={{ mt: 1, textTransform: 'none', color: 'text.secondary' }}
                    endIcon={<ExpandMoreIcon sx={{ transform: showDataRules ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />}
                >
                    View data format requirements
                </Button>
                <Collapse in={showDataRules}>
                    <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>Data Requirements</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Your upload must be an Excel file (<code>.xlsx</code>) with four sheets. Column names must match exactly.
                        </Typography>
                        <Box>
                            <Typography variant="body2" sx={{fontWeight: 'bold'}}>Sheet 1: <code>influencers</code></Typography>
                            <Typography variant="caption" color="text.secondary" component="p" sx={{ '& code': theme.typography.code }}>Columns: <code>ID</code>, <code>Name</code>, <code>Category</code>, <code>Gender</code>, <code>Follower_Count</code>, <code>Platform</code></Typography>
                        </Box>
                        <Box sx={{mt: 1.5}}>
                            <Typography variant="body2" sx={{fontWeight: 'bold'}}>Sheet 2: <code>posts</code></Typography>
                            <Typography variant="caption" color="text.secondary" component="p" sx={{ '& code': theme.typography.code }}>Columns: <code>Influencer_ID</code>, <code>Platform</code>, <code>Date</code>, <code>URL</code>, <code>Caption</code>, <code>Reach</code>, <code>Likes</code>, <code>Comments</code></Typography>
                        </Box>
                        <Box sx={{mt: 1.5}}>
                            <Typography variant="body2" sx={{fontWeight: 'bold'}}>Sheet 3: <code>tracking_data</code></Typography>
                            <Typography variant="caption" color="text.secondary" component="p" sx={{ '& code': theme.typography.code }}>Columns: <code>Source</code>, <code>Campaign</code>, <code>Influencer_ID</code>, <code>User_ID</code>, <code>Product</code>, <code>Date</code>, <code>Orders</code>, <code>Revenue</code></Typography>
                        </Box>
                        <Box sx={{mt: 1.5}}>
                            <Typography variant="body2" sx={{fontWeight: 'bold'}}>Sheet 4: <code>payouts</code></Typography>
                            <Typography variant="caption" color="text.secondary" component="p" sx={{ '& code': theme.typography.code }}>Columns: <code>Influencer_ID</code>, <code>Basis</code>, <code>Rate</code>, <code>Orders</code>, <code>Total_Payout</code></Typography>
                        </Box>
                    </Box>
                </Collapse>
            </Box>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        </Modal>
        {allData.length > 0 ? renderDashboard() : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', textAlign: 'center', px: 2 }}>
            <Typography variant="h4" color="text.primary" gutterBottom>Influencer ROI Dashboard</Typography>
            <Typography variant="subtitle1" color="text.secondary">Please select a data source to begin.</Typography>
          </Box>
        )}
      </main>
    </ThemeProvider>
  );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
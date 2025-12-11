import {
  AppState,
  DirectorOutput,
  MarketingRoute,
  SizeSelection,
  ContentPlan,
  ContentSet,
  ImageRatio,
} from "@/types";

// Initial size selection constant
export const INITIAL_SIZE_SELECTION: SizeSelection = {
  "1:1": false,
  "9:16": false,
  "4:5": false,
  "16:9": false,
  "1:1-commercial": false,
};

// State interface
export interface AppPageState {
  // App state
  appState: AppState;
  errorMsg: string;

  // File & Preview
  selectedFile: File | null;
  imagePreview: string | null;

  // Input fields
  productName: string;
  productInfo: string;
  productUrl: string;
  refCopy: string;

  // Phase 1 results
  analysisResult: DirectorOutput | null;
  activeRouteIndex: number;
  editedRoutes: MarketingRoute[];
  routeSupplements: string[];

  // Phase 2 size selection
  sizeSelection: SizeSelection;

  // Phase 2 content data
  contentPlan: ContentPlan | null;
  editedContentSets: ContentSet[];

  // Phase 2 image generation settings
  productImage: File | null;
  secondaryProduct: File | null;
  brandLogo: File | null;

  // API key & modals
  apiKey: string;
  serverHasKey: boolean;
  isGuideOpen: boolean;
  isApiKeyModalOpen: boolean;
}

// Initial state
export const initialAppState: AppPageState = {
  appState: AppState.IDLE,
  errorMsg: "",

  selectedFile: null,
  imagePreview: null,

  productName: "",
  productInfo: "",
  productUrl: "",
  refCopy: "",

  analysisResult: null,
  activeRouteIndex: 0,
  editedRoutes: [],
  routeSupplements: ["", "", ""],

  sizeSelection: INITIAL_SIZE_SELECTION,

  contentPlan: null,
  editedContentSets: [],

  productImage: null,
  secondaryProduct: null,
  brandLogo: null,

  apiKey: "",
  serverHasKey: false,
  isGuideOpen: false,
  isApiKeyModalOpen: false,
};

// Action types
export type AppAction =
  | { type: "SET_APP_STATE"; payload: AppState }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_SELECTED_FILE"; payload: { file: File; preview: string } }
  | { type: "SET_INPUT"; payload: { field: "productName" | "productInfo" | "productUrl" | "refCopy"; value: string } }
  | { type: "SET_ANALYSIS_RESULT"; payload: DirectorOutput }
  | { type: "SET_ACTIVE_ROUTE"; payload: number }
  | { type: "UPDATE_EDITED_ROUTE"; payload: { index: number; route: MarketingRoute } }
  | { type: "UPDATE_ROUTE_SUPPLEMENT"; payload: { index: number; value: string } }
  | { type: "SET_SIZE_SELECTION"; payload: { ratio: ImageRatio; checked: boolean } }
  | { type: "RESET_SIZE_SELECTION" }
  | { type: "SET_CONTENT_PLAN"; payload: ContentPlan }
  | { type: "SET_EDITED_CONTENT_SETS"; payload: ContentSet[] }
  | { type: "SET_PRODUCT_IMAGE"; payload: File | null }
  | { type: "SET_SECONDARY_PRODUCT"; payload: File | null }
  | { type: "SET_BRAND_LOGO"; payload: File | null }
  | { type: "SET_API_KEY"; payload: string }
  | { type: "SET_SERVER_HAS_KEY"; payload: boolean }
  | { type: "SET_GUIDE_OPEN"; payload: boolean }
  | { type: "SET_API_KEY_MODAL_OPEN"; payload: boolean }
  | { type: "RESET_RESULTS" }
  | { type: "RESET_PHASE2" };

// Reducer function
export function appReducer(state: AppPageState, action: AppAction): AppPageState {
  switch (action.type) {
    case "SET_APP_STATE":
      return { ...state, appState: action.payload };

    case "SET_ERROR":
      return { ...state, errorMsg: action.payload };

    case "CLEAR_ERROR":
      return { ...state, errorMsg: "" };

    case "SET_SELECTED_FILE":
      return {
        ...state,
        selectedFile: action.payload.file,
        imagePreview: action.payload.preview,
        // Reset results when new file is selected
        analysisResult: null,
        contentPlan: null,
        editedContentSets: [],
        sizeSelection: INITIAL_SIZE_SELECTION,
        appState: AppState.IDLE,
      };

    case "SET_INPUT":
      return { ...state, [action.payload.field]: action.payload.value };

    case "SET_ANALYSIS_RESULT":
      return {
        ...state,
        analysisResult: action.payload,
        editedRoutes: action.payload.marketing_routes,
        appState: AppState.SIZE_SELECTION,
      };

    case "SET_ACTIVE_ROUTE":
      return {
        ...state,
        activeRouteIndex: action.payload,
        // Reset phase 2 when changing route
        contentPlan: null,
        editedContentSets: [],
        sizeSelection: INITIAL_SIZE_SELECTION,
        appState:
          state.appState === AppState.SUITE_READY ||
          state.appState === AppState.PLANNING
            ? AppState.SIZE_SELECTION
            : state.appState,
      };

    case "UPDATE_EDITED_ROUTE":
      const newEditedRoutes = [...state.editedRoutes];
      newEditedRoutes[action.payload.index] = action.payload.route;
      return { ...state, editedRoutes: newEditedRoutes };

    case "UPDATE_ROUTE_SUPPLEMENT":
      const newSupplements = [...state.routeSupplements];
      newSupplements[action.payload.index] = action.payload.value;
      return { ...state, routeSupplements: newSupplements };

    case "SET_SIZE_SELECTION":
      return {
        ...state,
        sizeSelection: {
          ...state.sizeSelection,
          [action.payload.ratio]: action.payload.checked,
        },
      };

    case "RESET_SIZE_SELECTION":
      return { ...state, sizeSelection: INITIAL_SIZE_SELECTION };

    case "SET_CONTENT_PLAN":
      return {
        ...state,
        contentPlan: action.payload,
        editedContentSets: action.payload.content_sets,
        appState: AppState.SUITE_READY,
        // Auto-set productImage from selectedFile if not already set
        productImage: state.productImage || state.selectedFile,
      };

    case "SET_EDITED_CONTENT_SETS":
      return { ...state, editedContentSets: action.payload };

    case "SET_PRODUCT_IMAGE":
      return { ...state, productImage: action.payload };

    case "SET_SECONDARY_PRODUCT":
      return { ...state, secondaryProduct: action.payload };

    case "SET_BRAND_LOGO":
      return { ...state, brandLogo: action.payload };

    case "SET_API_KEY":
      return { ...state, apiKey: action.payload, errorMsg: "" };

    case "SET_SERVER_HAS_KEY":
      return { ...state, serverHasKey: action.payload };

    case "SET_GUIDE_OPEN":
      return { ...state, isGuideOpen: action.payload };

    case "SET_API_KEY_MODAL_OPEN":
      return { ...state, isApiKeyModalOpen: action.payload };

    case "RESET_RESULTS":
      return {
        ...state,
        analysisResult: null,
        contentPlan: null,
        editedContentSets: [],
        sizeSelection: INITIAL_SIZE_SELECTION,
        appState: AppState.IDLE,
      };

    case "RESET_PHASE2":
      return {
        ...state,
        contentPlan: null,
        editedContentSets: [],
        sizeSelection: INITIAL_SIZE_SELECTION,
        appState: AppState.SIZE_SELECTION,
      };

    default:
      return state;
  }
}

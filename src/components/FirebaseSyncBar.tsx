import React, { useEffect, useState } from "react";
import {
  User,
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp
} from "../lib/firebase";
import {
  ShieldCheck,
  LogIn,
  LogOut,
  Database,
  Save,
  FolderOpen,
  UserCheck,
  Sparkles,
  Cloud,
  Check,
  Trash2,
  AlertCircle
} from "lucide-react";
import { SensorMetrics, ScenarioType } from "../types";

interface SavedScenarioDoc {
  id: string;
  name: string;
  description: string;
  speed: number;
  distance: number;
  confidence: number;
  scenarioType: string;
  createdAt?: any;
}

interface FirebaseSyncBarProps {
  metrics: SensorMetrics;
  onApplyCustomScenario: (metrics: Partial<SensorMetrics>) => void;
}

export const FirebaseSyncBar: React.FC<FirebaseSyncBarProps> = ({
  metrics,
  onApplyCustomScenario
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioDoc[]>([]);
  const [scenarioNameInput, setScenarioNameInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>("");
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        fetchSavedScenarios(currentUser.uid);
      } else {
        setSavedScenarios([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchSavedScenarios = async (uid: string) => {
    try {
      const q = query(
        collection(db, "savedScenarios"),
        where("userId", "==", uid)
      );
      const snapshot = await getDocs(q);
      const docs: SavedScenarioDoc[] = [];
      snapshot.forEach((d) => {
        docs.push({ id: d.id, ...d.data() } as SavedScenarioDoc);
      });
      setSavedScenarios(docs);
    } catch (err) {
      console.error("Error fetching scenarios from Firestore:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error("Anonymous auth failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleSaveScenario = async () => {
    if (!user) return;
    if (!scenarioNameInput.trim()) return;

    try {
      setIsSaving(true);
      await addDoc(collection(db, "savedScenarios"), {
        userId: user.uid,
        name: scenarioNameInput.trim(),
        description: `Speed: ${metrics.vehicle_speed_kmh} km/h, Dist: ${metrics.obstacle_distance_m}m, Camera Conf: ${metrics.camera_confidence}`,
        speed: metrics.vehicle_speed_kmh,
        distance: metrics.obstacle_distance_m,
        confidence: metrics.camera_confidence,
        scenarioType: "CUSTOM",
        createdAt: new Date().toISOString()
      });

      setScenarioNameInput("");
      setSaveSuccessMsg("Scenario saved to Firestore!");
      setTimeout(() => setSaveSuccessMsg(""), 3000);
      fetchSavedScenarios(user.uid);
    } catch (err) {
      console.error("Save scenario failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "savedScenarios", id));
      if (user) fetchSavedScenarios(user.uid);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
      {/* Auth Status & Login Actions */}
      <div className="flex items-center space-x-3 w-full md:w-auto">
        <div className="flex items-center space-x-2">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300 font-bold">Firestore ADAS Sync:</span>
        </div>

        {user ? (
          <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-4 h-4 rounded-full" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-emerald-400 font-bold truncate max-w-[140px]">
              {user.displayName || user.email || `Engineer (${user.uid.substring(0, 6)})`}
            </span>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-rose-400 transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Google Sign-In</span>
            </button>
            <button
              onClick={handleAnonymousSignIn}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded-lg transition-all text-[11px]"
            >
              Anon Session
            </button>
          </div>
        )}
      </div>

      {/* Cloud Scenario Storage Controls */}
      {user && (
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <input
            type="text"
            placeholder="Name custom scenario..."
            value={scenarioNameInput}
            onChange={(e) => setScenarioNameInput(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs w-44 focus:border-cyan-500 focus:outline-none"
          />
          <button
            onClick={handleSaveScenario}
            disabled={isSaving || !scenarioNameInput.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Profile</span>
          </button>

          {savedScenarios.length > 0 && (
            <button
              onClick={() => setShowSavedModal(!showSavedModal)}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 relative"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cloud Scenarios ({savedScenarios.length})</span>
            </button>
          )}
        </div>
      )}

      {saveSuccessMsg && (
        <div className="text-emerald-400 text-[11px] font-bold flex items-center space-x-1">
          <Check className="w-3.5 h-3.5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Cloud Scenarios Dropdown Modal */}
      {showSavedModal && savedScenarios.length > 0 && (
        <div className="absolute right-4 top-16 z-50 bg-slate-950 border border-cyan-500/50 rounded-xl p-4 shadow-2xl w-80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 text-xs flex items-center space-x-1">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Firestore Saved Profiles</span>
            </span>
            <button
              onClick={() => setShowSavedModal(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {savedScenarios.map((sc) => (
              <div
                key={sc.id}
                onClick={() => {
                  onApplyCustomScenario({
                    vehicle_speed_kmh: sc.speed,
                    obstacle_distance_m: sc.distance,
                    camera_confidence: sc.confidence
                  });
                  setShowSavedModal(false);
                }}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-cyan-300 text-xs">{sc.name}</div>
                  <div className="text-[10px] text-slate-400">{sc.description}</div>
                </div>
                <button
                  onClick={(e) => handleDeleteScenario(sc.id, e)}
                  className="text-slate-500 hover:text-rose-400 p-1 opacity-60 group-hover:opacity-100"
                  title="Delete from Firestore"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

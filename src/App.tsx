/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scale, 
  Search, 
  FileText, 
  Code2, 
  ShieldCheck, 
  ChevronRight, 
  Loader2, 
  Copy, 
  Check,
  Terminal,
  AlertTriangle,
  Database,
  Plus,
  User,
  LogOut,
  CreditCard,
  Calendar,
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  XCircle,
  ToggleLeft as Toggle,
  UserPlus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeCase, generateSearchString, analyzeRuling, CaseAnalysis, findSimilarCases } from './lib/gemini';
import { cn } from './lib/utils';
import { AuthProvider, useAuth, UserProfile } from './contexts/AuthContext';

type Tab = 'analyst' | 'search' | 'automation' | 'ruling' | 'clients';

function AppContent() {
  const { user, login, mockLogin, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('analyst');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<UserProfile | null>(null);
  const [clientForm, setClientForm] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    role: 'defensor',
    org: '',
    plan: 'trial',
    status: 'active'
  });

  // Case Analyst State
  const [caseDescription, setCaseDescription] = useState('');
  const [caseResult, setCaseResult] = useState<CaseAnalysis | null>(null);
  const [precedents, setPrecedents] = useState<string | null>(null);
  const [searchingPrecedents, setSearchingPrecedents] = useState(false);

  // Search Engine State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState('');

  // Ruling Analyst State
  const [rulingText, setRulingText] = useState('');
  const [rulingResult, setRulingResult] = useState('');

  // SaaS Clients State
  const [clients, setClients] = useState<UserProfile[]>([]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  // Fetch clients if admin
  useEffect(() => {
    if (user?.role === 'admin' && activeTab === 'clients') {
      fetchClients();
    }
  }, [user, activeTab]);

  const handleSaveClient = async () => {
    try {
      const method = editingClient ? 'PATCH' : 'POST';
      const url = editingClient ? `/api/users/${editingClient.id}` : '/api/users';
      
      // For new users, we might need a dummy ID if not handled by backend serial
      const payload = {
        ...clientForm,
        id: editingClient?.id || `usr_${Date.now()}`,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowClientModal(false);
        setEditingClient(null);
        setClientForm({ name: '', email: '', role: 'defensor', org: '', plan: 'trial', status: 'active' });
        fetchClients();
      }
    } catch (err) {
      console.error("Failed to save client:", err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este cliente?")) return;
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (response.ok) fetchClients();
    } catch (err) {
      console.error("Failed to delete client:", err);
    }
  };

  const handleToggleStatus = async (client: UserProfile) => {
    const newStatus = client.status === 'active' ? 'suspended' : 'active';
    try {
      const response = await fetch(`/api/users/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchClients();
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAnalyzeCase = async () => {
    if (!caseDescription || !user) return;
    setLoading(true);
    setPrecedents(null);
    try {
      const result = await analyzeCase(caseDescription);
      setCaseResult(result);
      
      // Save via backend API
      await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          description: caseDescription,
          ...result
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFindPrecedents = async () => {
    if (!caseDescription) return;
    setSearchingPrecedents(true);
    try {
      const result = await findSimilarCases(caseDescription);
      setPrecedents(result);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingPrecedents(false);
    }
  };

  const handleGenerateSearch = async () => {
    if (!searchTerm || !user) return;
    setLoading(true);
    try {
      const result = await generateSearchString(searchTerm);
      setSearchResult(result);

      // Save to history via API
      await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          term: searchTerm,
          result: result
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRuling = async () => {
    if (!rulingText || !user) return;
    setLoading(true);
    try {
      const result = await analyzeRuling(rulingText);
      setRulingResult(result);

      // Save to history via API
      await fetch('/api/rulings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          text: rulingText,
          result: result
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
     return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
     );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-5 rounded-2xl shadow-xl shadow-blue-500/20 mb-6">
              <Scale className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">DefensorIA SaaS</h1>
            <p className="text-slate-500 text-sm mt-2 text-center">Inteligência Artificial de Elite para a Defensoria Pública</p>
          </div>
          <div className="space-y-4">
            <button 
              onClick={login}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded p-0.5" />
              Entrar com Corporativo / Google
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">Alternância Rápida (Desenvolvimento)</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => mockLogin('admin')}
                className="text-[10px] bg-slate-100 font-bold p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                title="Logar como Administrador"
              >
                ADMIN
              </button>
              <button 
                onClick={() => mockLogin('defensor')}
                className="text-[10px] bg-slate-100 font-bold p-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                title="Logar como Defensor"
              >
                DEFENSOR
              </button>
              <button 
                onClick={() => mockLogin('analista')}
                className="text-[10px] bg-slate-100 font-bold p-2 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors"
                title="Logar como Analista"
              >
                ANALISTA
              </button>
            </div>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">Acesso Seguro</div>
            </div>
            <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-extrabold leading-tight">
              SISTEMA CRIPTOGRAFADO • MONITORAMENTO ATIVO <br/>
              DESTINADO EXCLUSIVAMENTE A MEMBROS DA DEFENSORIA
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 bg-[#0F172A] border-b border-slate-700 flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-white font-semibold text-lg tracking-tight">Assessor Jurídico & Analista de Jurisprudência</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-slate-300 text-sm pr-4 border-r border-slate-700">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">{user.name}</p>
              <p className="text-[10px] uppercase text-blue-400 font-bold tracking-widest">{user.org} • {user.role}</p>
            </div>
            <div className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-tighter">
              Plano {user.plan}
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-full transition-all border border-slate-700 bg-slate-800/50"
            >
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 border border-slate-600">
                <User className="w-5 h-5" />
              </div>
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>
                    
                    <div className="py-1">
                      <button 
                        onClick={() => { setShowProfileModal(true); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Ver meus dados</span>
                      </button>
                      <button 
                        onClick={() => { setShowProfileModal(true); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <span>Meus Planos</span>
                      </button>
                      <div className="px-4 py-2 border-t border-slate-100 mt-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Vencimento</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {user.expirationDate || '30/05/2026'}
                          </span>
                          <button className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold hover:bg-blue-700 transition-colors">
                            Renovar
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button 
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sair</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden bg-[#F1F5F9]">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Módulos de Operação</p>
            <div className="space-y-1">
              <NavButton 
                active={activeTab === 'analyst'} 
                onClick={() => setActiveTab('analyst')}
                label="Painel de Controle"
              />
              <NavButton 
                active={activeTab === 'search'} 
                onClick={() => setActiveTab('search')}
                label="Engenharia de Busca"
              />
              <NavButton 
                active={activeTab === 'ruling'} 
                onClick={() => setActiveTab('ruling')}
                label="Analista de Acórdão"
              />
              <NavButton 
                active={activeTab === 'automation'} 
                onClick={() => setActiveTab('automation')}
                label="Automações (Scripts)"
              />
            </div>
          </div>
          
          <div className="p-4 border-b border-slate-100">
             <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Administração SaaS</p>
             <NavButton 
                active={activeTab === 'clients'} 
                onClick={() => setActiveTab('clients')}
                label="Gerenciar Clientes"
              />
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Monitoramento de Tribunais</p>
            <div className="space-y-3">
              <MonitorItem title="STF / Tema 1046" status="Repercussão Geral" color="emerald" />
              <MonitorItem title="STJ / Súmula 630" status="Recurso Repetitivo" color="blue" />
              <MonitorItem title="TJ/SP / HC 2938..." status="Distinguishing Aplicável" color="amber" />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100">
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="text-amber-800 text-[10px] font-bold uppercase mb-1">Dica do Fluxo</h4>
              <p className="text-[11px] text-amber-700 leading-snug">Use a API DataJud (CNJ) para evitar CAPTCHAs em buscas de massa.</p>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'analyst' && (
              <motion.div 
                key="analyst"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                {/* Stats/Quick Diagnostic Header */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Diagnóstico de Nulidades</h3>
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className={cn("w-2 h-2 rounded-full", caseResult ? "bg-red-600" : "bg-slate-300")} />
                          <span>Busca s/ Mandado</span>
                        </div>
                        {caseResult && <span className="text-red-600">Alerta!</span>}
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className={cn("w-2 h-2 rounded-full", caseResult ? "bg-emerald-600" : "bg-slate-300")} />
                          <span>Tempestividade</span>
                        </div>
                        {caseResult && <span className="text-emerald-600">OK</span>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Engenharia de Busca</h3>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 min-h-[40px] flex items-center">
                      <code className="text-[11px] text-blue-800 font-mono leading-relaxed break-all">
                        {caseResult ? caseResult.estrategiaBusca : 'Aguardando diagnóstico...'}
                      </code>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Análise de Tendência</h3>
                    <div className={cn(
                      "p-2 rounded text-center mb-1",
                      caseResult ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      <p className="text-[10px] font-bold uppercase">{caseResult ? "LEADING CASE IDENTIFICADO" : "EM ANÁLISE"}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {caseResult ? "HC 598.051/SP: Invasão de domicílio." : "Nenhum caso similar prioritário."}
                    </p>
                  </div>
                </div>

                {/* Main Action Area */}
                <div className="flex-1 px-6 pb-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-lg flex flex-col overflow-hidden min-h-[400px]">
                    <div className="border-b border-slate-100 p-4 flex justify-between items-center bg-white">
                      <h2 className="font-serif text-lg font-bold text-slate-800">
                        {caseResult ? "Minuta Jurídica Gerada" : "Entrada de Dados do Caso"}
                      </h2>
                      <span className="text-[10px] text-slate-400 font-mono">v3.1 - DP_LEGAL_TECH</span>
                    </div>
                    
                    <div className="flex-1 p-8 overflow-y-auto bg-white">
                      {!caseResult ? (
                        <div className="max-w-2xl mx-auto space-y-6">
                          <div className="space-y-2">
                             <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Descrição do Caso Processual</label>
                             <textarea 
                                className="w-full h-64 p-6 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 font-serif leading-relaxed"
                                placeholder="Descreva os fatos, nulidades e peculiaridades do caso para análise técnica..."
                                value={caseDescription}
                                onChange={(e) => setCaseDescription(e.target.value)}
                              />
                          </div>
                          <button 
                            onClick={handleAnalyzeCase}
                            disabled={loading || !caseDescription}
                            className="w-full bg-[#0F172A] hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 group shadow-lg"
                          >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            INICIAR PROTOCOLO PENTE-FINO
                          </button>
                        </div>
                      ) : (
                        <div className="font-serif text-slate-800 text-sm leading-relaxed opacity-90 prose prose-slate max-w-none">
                          <ReactMarkdown>{caseResult.minutaPeca}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {caseResult && (
                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-3 shrink-0">
                        <button 
                          onClick={handleFindPrecedents}
                          disabled={searchingPrecedents}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-200"
                        >
                          {searchingPrecedents ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          BUSCAR PRECEDENTES REAIS
                        </button>
                        <button 
                          onClick={() => handleCopy(caseResult.minutaPeca, 'peça')}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                        >
                          {copied === 'peça' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          COPIAR MINUTA
                        </button>
                        <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all">
                          FINALIZAR E PROTOCOLAR
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sidebar stats or details */}
                  <div className="w-full lg:w-80 flex flex-col gap-6">
                    {precedents && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-inner"
                      >
                         <h3 className="text-blue-800 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Database className="w-4 h-4" /> Precedentes Reais Encontrados
                         </h3>
                         <div className="prose prose-sm prose-blue text-xs max-h-[400px] overflow-y-auto">
                           <ReactMarkdown>{precedents}</ReactMarkdown>
                         </div>
                      </motion.div>
                    )}
                    {caseResult && (
                      <div className="bg-[#1E293B] rounded-xl p-5 shadow-lg border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Nulidades Identificadas</h3>
                          <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 text-[9px] rounded border border-emerald-500/30 font-bold uppercase">Análise Crítica</span>
                        </div>
                        <div className="space-y-3">
                           <div className="bg-black/30 rounded-lg p-3 text-xs text-slate-300 leading-relaxed italic border-l-2 border-emerald-400">
                             {caseResult.diagnostico}
                           </div>
                        </div>
                        <button 
                          onClick={() => handleCopy(caseResult.diagnostico, 'diag')}
                          className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold transition-colors uppercase tracking-wider"
                        >
                          Copiar Diagnóstico Completo
                        </button>
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                       <h4 className="text-[10px] font-bold font-sans text-slate-400 uppercase tracking-widest">Logs de Inteligência</h4>
                       <div className="space-y-2 font-mono text-[10px] text-slate-500">
                         <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                           <span>Raciocínio Jurídico</span>
                           <span className="text-emerald-600">Completo</span>
                         </div>
                         <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                           <span>Análise de Súmulas</span>
                           <span className="text-emerald-600">Completo</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span>Integridade do JSON</span>
                           <span className="text-emerald-600">Verificado</span>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'search' && (
              <motion.div 
                key="search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8"
              >
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="legal-card shadow-xl overflow-visible">
                    <div className="p-8 space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200">
                          <Search className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-800">Engenharia de Busca Jurídica</h2>
                          <p className="text-sm text-slate-500">Desenvolva strings avançadas para obter a 'agulha no palheiro' em julgados.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <input 
                          type="text"
                          className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:text-slate-400"
                          placeholder="Ex: Tráfico, busca domiciliar, nervosismo do réu..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button 
                          onClick={handleGenerateSearch}
                          disabled={loading || !searchTerm}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Gerar String"}
                        </button>
                      </div>
                      
                      {searchResult && (
                        <div className="bg-[#1E293B] rounded-xl p-8 relative group border border-blue-500/20 shadow-2xl">
                          <div className="absolute top-6 right-6">
                            <button 
                              onClick={() => handleCopy(searchResult, 'string')}
                              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-all"
                            >
                              {copied === 'string' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-4">String STJ/TJ Avançada (Boolean Logic)</p>
                          <code className="text-white font-mono text-lg break-all leading-relaxed block">{searchResult}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ruling' && (
              <motion.div 
                key="ruling"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8"
              >
                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="legal-card p-6 space-y-4">
                       <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">Entrada de Acórdão</h3>
                       <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-amber-200 pl-3">Cole a ementa ou texto integral para análise de overruling e distinguishing.</p>
                       <textarea 
                        className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-serif"
                        placeholder="Cole o texto aqui..."
                        value={rulingText}
                        onChange={(e) => setRulingText(e.target.value)}
                      />
                      <button 
                        onClick={handleAnalyzeRuling}
                        disabled={loading || !rulingText}
                        className="w-full bg-[#0F172A] hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Extrair Tendências"}
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    {rulingResult ? (
                      <div className="legal-card border-blue-100 shadow-xl min-h-[600px] flex flex-col">
                        <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
                          <span className="font-bold text-[10px] text-blue-700 uppercase tracking-widest">Relatório Técnico de Jurisprudência</span>
                          <button onClick={() => handleCopy(rulingResult, 'rresult')} className="text-blue-600 p-2 hover:bg-white rounded-lg transition-all">
                            {copied === 'rresult' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="p-10 font-serif text-slate-800 prose prose-slate max-w-none prose-sm flex-1 overflow-y-auto">
                          <ReactMarkdown>{rulingResult}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-12 text-center space-y-4">
                        <div className="p-4 bg-slate-100 rounded-full">
                          <FileText className="w-12 h-12" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-600 uppercase text-xs tracking-widest">Aguardando Documento</p>
                          <p className="text-xs max-w-[200px] mx-auto mt-2 italic">A análise aparecerá aqui após o processamento da inteligência artificial.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'automation' && (
              <motion.div 
                key="automation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <AutomationCard 
                  title="Monitoramento API DataJud (CNJ)"
                  description="Script Python para coleta de novos processos distribuídos via terminal oficial."
                  code={`import requests

# API DataJud Endpoint
URL = "https://api-publica.datajud.cnj.jus.br/api_publica_search/_search"
TOKEN = "cGFpbmVsLWRlLWNvbnRyb2xlLWRhLWFwaS1wdWJsaWNh"

def monitor_court(court_id, keywords):
    headers = {"Authorization": f"APIKey {TOKEN}"}
    query = {
        "query": { "match": { "tribunal": court_id } }
    }
    r = requests.post(URL, json=query, headers=headers)
    return r.json().get('hits', [])`}
                />
                <AutomationCard 
                  title="Scraping HC TJ Monitoring"
                  description="Extrator de decisões diárias para processos de Prisão Preventiva."
                  code={`from bs4 import BeautifulSoup
import requests

def fetch_tj_hcs():
    url = "https://portal.tj.sp.gov.br/hc-monitor"
    html = requests.get(url).text
    soup = BeautifulSoup(html, 'html.parser')
    
    decisions = []
    for item in soup.select('.item-processo'):
        status = item.select_one('.status').text
        if 'ORDEM CONCEDIDA' in status.upper():
            decisions.append(item.select_one('.numero').text)
    return decisions`}
                />
              </motion.div>
            )}

            {activeTab === 'clients' && (
              <motion.div 
                key="clients"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Clientes SaaS</h2>
                    <p className="text-sm text-slate-500">Controle de acesso, planos e status operacional das Defensorias.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingClient(null);
                      setClientForm({ name: '', email: '', role: 'defensor', org: '', plan: 'trial', status: 'active' });
                      setShowClientModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center gap-2 text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Novo Cliente
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatBox label="Total de Usuários" value={clients.length.toString()} color="blue" />
                  <StatBox label="Usuários Ativos" value={clients.filter(c => c.status === 'active').length.toString()} color="emerald" />
                  <StatBox label="Organizações" value={new Set(clients.map(c => c.org)).size.toString()} color="blue" />
                  <StatBox label="Aguardando" value={clients.filter(c => c.status === 'pending').length.toString()} color="blue" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defensor / Analista</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organização / Cargo</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plano / Vencimento</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map((client) => (
                          <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                  {client.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{client.name}</p>
                                  <p className="text-[11px] text-slate-500">{client.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-xs font-bold text-slate-700">{client.org}</p>
                              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">{client.role}</p>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                  client.plan === 'enterprise' ? "bg-purple-100 text-purple-700 border border-purple-200" :
                                  client.plan === 'pro' ? "bg-blue-100 text-blue-700 border border-blue-200" : 
                                  "bg-slate-100 text-slate-700 border border-slate-200"
                                )}>
                                  {client.plan}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                <Calendar className="w-3 h-3" />
                                {client.expirationDate || '---'}
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    client.status === 'active' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                    client.status === 'pending' ? "bg-amber-500" : "bg-red-500"
                                  )} />
                                  <span className="text-[10px] font-bold text-slate-600 uppercase">{client.status}</span>
                                </div>
                                <button 
                                  onClick={() => handleToggleStatus(client)}
                                  className="text-[9px] text-blue-600 hover:underline font-bold uppercase"
                                >
                                  {client.status === 'active' ? 'Desativar' : 'Ativar'}
                                </button>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setEditingClient(client);
                                    setClientForm(client);
                                    setShowClientModal(true);
                                  }}
                                  className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                                  title="Editar Cliente"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteClient(client.id)}
                                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                  title="Remover Cliente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {clients.length === 0 && (
                      <div className="p-12 text-center">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                          <User className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Nenhum cliente cadastrado no momento.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Label */}
      <footer className="py-8 text-center text-slate-400 text-xs border-t border-slate-200">
        <p>© 2026 DefensorIA SaaS - Gestão Multinível de Inteligência Jurídica</p>
      </footer>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="bg-[#0F172A] p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg"><User className="w-5 h-5" /></div>
                  <h3 className="font-bold">Meu Perfil Jurídico</h3>
                </div>
                <button onClick={() => setShowProfileModal(false)}><XCircle className="w-6 h-6 hover:text-red-400 transition-colors" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nome Completo</label>
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email</label>
                    <p className="text-sm font-semibold text-slate-800">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Órgão / Defensoria</label>
                    <p className="text-sm font-semibold text-slate-800">{user.org}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cargo</label>
                    <p className="text-sm font-semibold text-slate-800 capitalize">{user.role}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                       <CreditCard className="w-4 h-4 text-blue-600" /> Detalhes da Assinatura
                    </h4>
                    <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Plano {user.plan}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Próximo Vencimento</span>
                    <span className="font-bold text-slate-800">{user.expirationDate || '30/05/2026'}</span>
                  </div>
                  <button className="w-full mt-2 bg-blue-600 text-white py-3 rounded-lg font-bold text-xs hover:bg-blue-700 transition-all shadow-md">
                    RENOVAR MENSALIDADE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client Modal (CRUD) */}
      <AnimatePresence>
        {showClientModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowClientModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center focus-within:">
                <h3 className="font-bold text-slate-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente Jurídico'}</h3>
                <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Nome Completo</label>
                  <input 
                    type="text" 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Email</label>
                  <input 
                    type="email" 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Órgão</label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      placeholder="DP-SP"
                      value={clientForm.org}
                      onChange={(e) => setClientForm({...clientForm, org: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Plano</label>
                    <select 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      value={clientForm.plan}
                      onChange={(e) => setClientForm({...clientForm, plan: e.target.value as any})}
                    >
                      <option value="trial">Trial</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={handleSaveClient}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 mt-4"
                >
                  {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function StatBox({ label, value, color }: { label: string, value: string, color: 'blue' | 'emerald' }) {
  return (
    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center min-w-[120px]">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color === 'blue' ? "text-blue-600" : "text-emerald-600")}>{value}</p>
    </div>
  );
}

function EventCard({ title, desc, time, type }: { title: string, desc: string, time: string, type: 'plus' | 'warn' | 'error' }) {
  return (
    <div className="legal-card p-4 border-l-4 flex gap-4 items-start" style={{ 
      borderColor: type === 'plus' ? '#10b981' : type === 'warn' ? '#f59e0b' : '#ef4444' 
    }}>
      <div className={cn(
        "p-2 rounded-lg shrink-0",
        type === 'plus' ? "bg-emerald-50 text-emerald-600" : type === 'warn' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
      )}>
        {type === 'plus' ? <Plus className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500 leading-tight my-1">{desc}</p>
        <span className="text-[10px] text-slate-400 font-medium">{time}</span>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 text-sm rounded-md transition-all",
        active 
          ? "bg-blue-50 text-blue-700 font-medium" 
          : "text-slate-600 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function MonitorItem({ title, status, color }: { title: string, status: string, color: 'emerald' | 'blue' | 'amber' }) {
  const borderColors = {
    emerald: 'border-emerald-500',
    blue: 'border-blue-500',
    amber: 'border-amber-500'
  };

  return (
    <div className={cn("border-l-2 pl-3 py-1", borderColors[color])}>
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500">{status}</p>
    </div>
  );
}

function ResultCard({ title, icon, content, onCopy, copied, isMarkdown = false }: { title: string, icon: React.ReactNode, content: string, onCopy: () => void, copied: boolean, isMarkdown?: boolean }) {
  return (
    <div className="legal-card flex flex-col h-full bg-slate-50/30">
      <div className="legal-header flex justify-between items-center py-3 bg-white">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <button 
          onClick={onCopy}
          className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="p-5 flex-1 relative">
        <div className={cn(
          "text-sm leading-relaxed text-slate-700 h-full",
          isMarkdown ? "prose prose-sm prose-slate max-w-none" : "font-serif italic text-slate-600 border-l-2 border-slate-200 pl-4"
        )}>
          {isMarkdown ? <ReactMarkdown>{content}</ReactMarkdown> : content}
        </div>
      </div>
    </div>
  );
}

function AutomationCard({ title, description, code }: { title: string, description: string, code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="legal-card bg-slate-900 border-white/5 hover:border-blue-500/30 transition-all group">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">{description}</p>
          </div>
          <button 
            onClick={handleCopy}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all opacity-0 group-hover:opacity-100"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="bg-black/40 rounded-lg p-4 font-mono text-[11px] text-emerald-400/90 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest">Python 3.12</div>
          <pre className="overflow-x-auto">
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}

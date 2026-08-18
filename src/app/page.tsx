"use client";

import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, Plus, Edit, Eraser, X, ClipboardCheck, History } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PantallaPrincipal() {
  // --- ESTADOS: PAPELETAS ---
  const [papeleta, setPapeleta] = useState('');
  const [estadoPapeleta, setEstadoPapeleta] = useState<string | null>(null);
  const [fechaPapeletaEncontrada, setFechaPapeletaEncontrada] = useState<string | null>(null);
  const [fechaNuevaPapeleta, setFechaNuevaPapeleta] = useState('');
  
  // Nuevo estado: Historial de las últimas 5 papeletas
  const [historialPapeletas, setHistorialPapeletas] = useState<{numero: string, estado: string}[]>([]);

  // --- ESTADOS: USUARIOS ---
  const [busquedaRemitente, setBusquedaRemitente] = useState('');
  const [remitentes, setRemitentes] = useState<any[]>([]);
  
  const [busquedaDestinatario, setBusquedaDestinatario] = useState('');
  const [destinatarios, setDestinatarios] = useState<any[]>([]);

  // Estado para resaltar toda la fila del usuario seleccionado
  const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState<string | null>(null);

  // --- ESTADOS: MODAL NUEVO / EDITAR CLIENTE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formInicial = { id: '', nombre_razon_social: '', cedula_ruc: '', isla: '', direccion: '', telefono: '', correo: '', tipo: 'REMITENTE' };
  const [formData, setFormData] = useState(formInicial);

  // --- LÓGICA: RESALTAR TEXTO BUSCADO ---
  const resaltarTexto = (texto: string, busqueda: string) => {
    if (!busqueda || !texto) return texto;
    const partes = texto.toString().split(new RegExp(`(${busqueda})`, 'gi'));
    return (
      <span>
        {partes.map((parte, i) => 
          parte.toLowerCase() === busqueda.toLowerCase() ? (
            <strong key={i} className="font-black text-blue-900 bg-blue-100 px-1 rounded">
              {parte}
            </strong>
          ) : (
            <span key={i}>{parte}</span>
          )
        )}
      </span>
    );
  };

  // --- LÓGICA: PAPELETAS ---
  const agregarAlHistorial = (numero: string, estado: string) => {
    setHistorialPapeletas(prev => {
      // Agregamos la nueva papeleta al inicio, evitamos duplicados y mantenemos solo 5
      const nuevo = [{numero, estado}, ...prev.filter(p => p.numero !== numero)].slice(0, 5);
      return nuevo;
    });
  };

  const limpiarPapeleta = () => {
    setPapeleta('');
    setEstadoPapeleta(null);
    setFechaPapeletaEncontrada(null);
    setFechaNuevaPapeleta('');
  };

  const manejarEscaneoPapeleta = async (valorEscrito: string) => {
    setPapeleta(valorEscrito);

    if (valorEscrito.length < 3) {
      setEstadoPapeleta(null);
      setFechaPapeletaEncontrada(null);
      return;
    }

    const { data, error } = await supabase
      .from('papeletas')
      .select('estado, fecha_papeleta')
      .eq('numero_papeleta', valorEscrito.toUpperCase())
      .single();

    if (error) {
      setEstadoPapeleta('NO_ENCONTRADA');
      setFechaPapeletaEncontrada(null);
    } else if (data) {
      setEstadoPapeleta(data.estado);
      setFechaPapeletaEncontrada(data.fecha_papeleta);
      agregarAlHistorial(valorEscrito.toUpperCase(), data.estado);
    }
  };

  const registrarNuevaPapeleta = async () => {
    if (!fechaNuevaPapeleta) return alert('Por favor, selecciona la fecha del depósito.');
    
    const { error } = await supabase
      .from('papeletas')
      .insert([{ 
        numero_papeleta: papeleta.toUpperCase(), 
        fecha_papeleta: fechaNuevaPapeleta, 
        estado: 'USADA',
        fecha_uso: new Date().toISOString()
      }]);

    if (!error) {
      setEstadoPapeleta('GUARDADO_EXITO');
      agregarAlHistorial(papeleta.toUpperCase(), 'USADA');
      
      setTimeout(() => {
        limpiarPapeleta();
      }, 3000);
    }
  };

  const marcarPapeletaComoUsada = async () => {
    const { error } = await supabase
      .from('papeletas')
      .update({ estado: 'USADA', fecha_uso: new Date().toISOString() })
      .eq('numero_papeleta', papeleta.toUpperCase());

    if (!error) {
      setEstadoPapeleta('USADA');
      agregarAlHistorial(papeleta.toUpperCase(), 'USADA');
    }
  };

  // --- LÓGICA: USUARIOS ---
  const buscarUsuarios = async (termino: string, tipo: string, setResultados: any) => {
    if (termino.length < 2) {
      setResultados([]);
      return;
    }
    const { data, error } = await supabase
      .from('comerciantes')
      .select('*')
      .or(`nombre_razon_social.ilike.%${termino}%,cedula_ruc.ilike.%${termino}%,telefono.ilike.%${termino}%`)
      .in('tipo', [tipo, 'AMBOS'])
      .eq('estado', true)
      .limit(10);
    if (data && !error) setResultados(data);
  };

  const limpiarBusqueda = (tipo: 'REMITENTE' | 'DESTINATARIO') => {
    if (tipo === 'REMITENTE') {
      setBusquedaRemitente('');
      setRemitentes([]);
    } else {
      setBusquedaDestinatario('');
      setDestinatarios([]);
    }
    setUsuarioSeleccionadoId(null);
  };

  const abrirModalEditar = (usuario: any) => {
    setFormData({
      id: usuario.id,
      nombre_razon_social: usuario.nombre_razon_social,
      cedula_ruc: usuario.cedula_ruc || '',
      isla: usuario.isla || '',
      direccion: usuario.direccion || '',
      telefono: usuario.telefono || '',
      correo: usuario.correo || '',
      tipo: usuario.tipo
    });
    setIsModalOpen(true);
  };

  const guardarCliente = async () => {
    if (!formData.nombre_razon_social) return alert('El nombre es obligatorio');
    
    if (formData.id) {
      const { error } = await supabase
        .from('comerciantes')
        .update({
          nombre_razon_social: formData.nombre_razon_social,
          cedula_ruc: formData.cedula_ruc,
          isla: formData.isla,
          direccion: formData.direccion,
          telefono: formData.telefono,
          correo: formData.correo,
          tipo: formData.tipo
        })
        .eq('id', formData.id);

      if (!error) {
        alert('Cliente actualizado exitosamente');
        limpiarBusqueda('REMITENTE');
        limpiarBusqueda('DESTINATARIO');
      } else {
        alert('Ocurrió un error al actualizar');
      }
    } else {
      const { id, ...datosParaInsertar } = formData;
      const { error } = await supabase.from('comerciantes').insert([datosParaInsertar]);
      if (!error) alert('Cliente nuevo guardado exitosamente');
    }

    setIsModalOpen(false);
    setFormData(formInicial);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-sm md:p-6 md:text-base">
      
      {/* HEADER CENTRADO Y COMPACTO */}
      <header className="mb-4 border-b pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col items-center md:items-start text-center md:text-left w-full md:w-auto flex-1 md:flex-none">
          <div className="flex items-center gap-2 justify-center">
            <ClipboardCheck size={32} className="text-blue-800" />
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">BÚSQUEDA DE USUARIOS</h1>
          </div>
          <p className="text-sm text-gray-500 font-medium md:ml-10">Módulo de Inspectores</p>
        </div>
        <button 
          onClick={() => {
            setFormData(formInicial);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm text-sm"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </header>

      {/* MÓDULO BÚSQUEDA USUARIOS (AHORA PRIMERO) */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        
        {/* Remitente (Azul) */}
        <section className="bg-blue-50 p-4 rounded-xl shadow-sm border-2 border-blue-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-blue-800">Remitente</h2>
            <button onClick={() => limpiarBusqueda('REMITENTE')} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors">
              <Eraser size={14} /> Limpiar
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-blue-400" size={18} />
            <input
              type="text"
              placeholder="Buscar remitente (Nombre, RUC, Teléfono)..."
              className="w-full pl-10 pr-10 py-2 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm shadow-inner"
              value={busquedaRemitente}
              onChange={(e) => {
                setBusquedaRemitente(e.target.value);
                buscarUsuarios(e.target.value, 'REMITENTE', setRemitentes);
              }}
            />
            {busquedaRemitente && (
              <button onClick={() => limpiarBusqueda('REMITENTE')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700"><X size={18}/></button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left bg-white rounded-lg overflow-hidden shadow-sm text-xs md:text-sm">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-3 py-2">Nombre / Razón Social</th>
                  <th className="px-3 py-2">Cédula / RUC</th>
                  <th className="px-3 py-2">Isla</th>
                  <th className="px-3 py-2">Dirección</th>
                  <th className="px-3 py-2">Teléfono</th>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {remitentes.length === 0 ? (
                  <tr className="border-b text-gray-500 text-center">
                    <td colSpan={7} className="px-3 py-4">{busquedaRemitente.length < 2 ? "Escribe para buscar..." : "Sin resultados"}</td>
                  </tr>
                ) : (
                  remitentes.map((u) => (
                    <tr 
                      key={u.id} 
                      className={`border-b cursor-pointer transition-colors ${usuarioSeleccionadoId === u.id ? 'bg-blue-200 shadow-inner' : 'hover:bg-blue-100'}`}
                      onClick={() => setUsuarioSeleccionadoId(u.id)}
                    >
                      <td className="px-3 py-2 font-medium">{resaltarTexto(u.nombre_razon_social, busquedaRemitente)}</td>
                      <td className="px-3 py-2">{resaltarTexto(u.cedula_ruc || '-', busquedaRemitente)}</td>
                      <td className="px-3 py-2">{u.isla || '-'}</td>
                      <td className="px-3 py-2 truncate max-w-xs">{u.direccion || '-'}</td>
                      <td className="px-3 py-2">{resaltarTexto(u.telefono || '-', busquedaRemitente)}</td>
                      <td className="px-3 py-2">{u.correo || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); abrirModalEditar(u); }}
                          className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded border border-blue-200 shadow-sm" 
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Destinatario (Verde) */}
        <section className="bg-green-50 p-4 rounded-xl shadow-sm border-2 border-green-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-green-800">Destinatario</h2>
            <button onClick={() => limpiarBusqueda('DESTINATARIO')} className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-bold px-3 py-1 rounded bg-green-100 hover:bg-green-200 transition-colors">
              <Eraser size={14} /> Limpiar
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-green-400" size={18} />
            <input
              type="text"
              placeholder="Buscar destinatario (Nombre, RUC, Teléfono)..."
              className="w-full pl-10 pr-10 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500 text-sm shadow-inner"
              value={busquedaDestinatario}
              onChange={(e) => {
                setBusquedaDestinatario(e.target.value);
                buscarUsuarios(e.target.value, 'DESTINATARIO', setDestinatarios);
              }}
            />
            {busquedaDestinatario && (
              <button onClick={() => limpiarBusqueda('DESTINATARIO')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700"><X size={18}/></button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left bg-white rounded-lg overflow-hidden shadow-sm text-xs md:text-sm">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="px-3 py-2">Nombre / Razón Social</th>
                  <th className="px-3 py-2">Cédula / RUC</th>
                  <th className="px-3 py-2">Isla</th>
                  <th className="px-3 py-2">Dirección</th>
                  <th className="px-3 py-2">Teléfono</th>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {destinatarios.length === 0 ? (
                  <tr className="border-b text-gray-500 text-center">
                    <td colSpan={7} className="px-3 py-4">{busquedaDestinatario.length < 2 ? "Escribe para buscar..." : "Sin resultados"}</td>
                  </tr>
                ) : (
                  destinatarios.map((u) => (
                    <tr 
                      key={u.id} 
                      className={`border-b cursor-pointer transition-colors ${usuarioSeleccionadoId === u.id ? 'bg-green-200 shadow-inner' : 'hover:bg-green-100'}`}
                      onClick={() => setUsuarioSeleccionadoId(u.id)}
                    >
                      <td className="px-3 py-2 font-medium">{resaltarTexto(u.nombre_razon_social, busquedaDestinatario)}</td>
                      <td className="px-3 py-2">{resaltarTexto(u.cedula_ruc || '-', busquedaDestinatario)}</td>
                      <td className="px-3 py-2">{u.isla || '-'}</td>
                      <td className="px-3 py-2 truncate max-w-xs">{u.direccion || '-'}</td>
                      <td className="px-3 py-2">{resaltarTexto(u.telefono || '-', busquedaDestinatario)}</td>
                      <td className="px-3 py-2">{u.correo || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); abrirModalEditar(u); }}
                          className="p-1.5 bg-white text-green-600 hover:bg-green-50 rounded border border-green-200 shadow-sm" 
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* MÓDULO PAPELETAS (AHORA AL FINAL Y MÁS COMPACTO) */}
      <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Zona de Escaneo */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold mb-3 text-gray-700 flex items-center gap-2">
              <Search size={20} className="text-gray-400" />
              Verificación Rápida de Papeletas
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Digitar número de papeleta..."
                className="w-full pl-4 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-600 text-lg uppercase font-bold transition-colors shadow-inner"
                value={papeleta}
                onChange={(e) => manejarEscaneoPapeleta(e.target.value)}
              />
              {papeleta && (
                <button 
                  onClick={limpiarPapeleta} 
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-700 transition-colors"
                  title="Limpiar"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* ALERTA: ÉXITO AL GUARDAR NUEVA */}
            {estadoPapeleta === 'GUARDADO_EXITO' && (
              <div className="mt-3 p-4 bg-blue-50 border-l-4 border-blue-500 rounded flex items-center justify-between text-blue-800 animate-pulse">
                <div className="flex items-center gap-3">
                  <CheckCircle size={28} className="text-blue-600" />
                  <div>
                    <h3 className="font-bold text-lg">GUARDADO EXITOSO</h3>
                    <p className="text-sm font-medium text-blue-900">La papeleta se marcó como USADA.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ALERTA ROJA (USADA HISTÓRICA) */}
            {estadoPapeleta === 'USADA' && (
              <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-500 rounded flex items-center gap-3 text-red-800">
                <XCircle size={28} />
                <div>
                  <h3 className="font-bold text-lg">PAPELETA YA UTILIZADA</h3>
                  {fechaPapeletaEncontrada && (
                    <p className="text-sm font-medium text-red-900">Fecha del depósito: {fechaPapeletaEncontrada}</p>
                  )}
                </div>
              </div>
            )}

            {/* ALERTA VERDE (DISPONIBLE) */}
            {estadoPapeleta === 'DISPONIBLE' && (
              <div className="mt-3 p-4 bg-green-50 border-l-4 border-green-500 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between text-green-800 gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle size={28} />
                  <div>
                    <h3 className="font-bold text-lg">PAPELETA DISPONIBLE</h3>
                    {fechaPapeletaEncontrada && (
                      <p className="text-sm font-medium text-green-900">Fecha del depósito: {fechaPapeletaEncontrada}</p>
                    )}
                  </div>
                </div>
                <button onClick={marcarPapeletaComoUsada} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm w-full sm:w-auto">
                  Marcar como Usada
                </button>
              </div>
            )}

            {/* ALERTA AMARILLA (NO REGISTRADA) */}
            {estadoPapeleta === 'NO_ENCONTRADA' && (
              <div className="mt-3 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <div className="flex items-center gap-3 text-yellow-800 mb-3">
                  <AlertTriangle size={24} />
                  <h3 className="font-bold text-lg">PAPELETA NO REGISTRADA</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Fecha del depósito:</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-yellow-300 rounded focus:outline-none focus:border-yellow-500 text-sm font-bold bg-white"
                      value={fechaNuevaPapeleta}
                      onChange={(e) => setFechaNuevaPapeleta(e.target.value)}
                    />
                  </div>
                  <button onClick={registrarNuevaPapeleta} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded font-bold shadow-sm w-full sm:w-auto text-sm transition-colors">
                    Guardar y Utilizar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Historial Reciente */}
          <div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col h-full">
            <h3 className="font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2 flex items-center gap-2 text-sm">
              <History size={16} className="text-gray-500" />
              Historial Reciente (Últimas 5)
            </h3>
            <ul className="flex-1 flex flex-col gap-2">
              {historialPapeletas.length === 0 ? (
                <li className="text-sm text-gray-400 italic text-center py-4">Aún no hay papeletas consultadas...</li>
              ) : (
                historialPapeletas.map((h, i) => (
                  <li key={i} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                    <span className="font-mono font-bold text-gray-700 text-sm">{h.numero}</span>
                    <span className={`text-[10px] uppercase px-2 py-1 rounded font-black ${
                      h.estado === 'USADA' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {h.estado}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
          
        </div>
      </section>

      {/* MODAL NUEVO / EDITAR CLIENTE (Sin cambios funcionales, ajustado el diseño a más compacto) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-blue-600 p-3 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold">{formData.id ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h2>
              <button onClick={() => { setIsModalOpen(false); setFormData(formInicial); }} className="hover:bg-blue-700 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Nombre / Razón Social *</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none bg-gray-50" 
                  value={formData.nombre_razon_social} onChange={(e)=>setFormData({...formData, nombre_razon_social: e.target.value})} />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Cédula / RUC</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none bg-gray-50" 
                  value={formData.cedula_ruc} onChange={(e)=>setFormData({...formData, cedula_ruc: e.target.value})} />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Teléfono</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none bg-gray-50" 
                  value={formData.telefono} onChange={(e)=>setFormData({...formData, telefono: e.target.value})} />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Isla</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none bg-gray-50" 
                  value={formData.isla} onChange={(e)=>setFormData({...formData, isla: e.target.value})} />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tipo de Cliente</label>
                <select className="w-full p-2 border rounded focus:border-blue-500 outline-none bg-gray-50"
                  value={formData.tipo} onChange={(e)=>setFormData({...formData, tipo: e.target.value})}>
                  <option value="REMITENTE">Solo Remitente</option>
                  <option value="DESTINATARIO">Solo Destinatario</option>
                  <option value="AMBOS">Remitente y Destinatario</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Dirección</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none bg-gray-50" 
                  value={formData.direccion} onChange={(e)=>setFormData({...formData, direccion: e.target.value})} />
              </div>
            </div>
            <div className="bg-gray-100 p-3 border-t flex justify-end gap-3">
              <button onClick={() => { setIsModalOpen(false); setFormData(formInicial); }} className="px-4 py-2 rounded text-gray-600 text-sm font-bold hover:bg-gray-200">
                Cancelar
              </button>
              <button onClick={guardarCliente} className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm">
                {formData.id ? 'Actualizar Cliente' : 'Guardar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
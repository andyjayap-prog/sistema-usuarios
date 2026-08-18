"use client";

import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, Plus, Edit, Eraser, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PantallaPrincipal() {
  // --- ESTADOS: PAPELETAS ---
  const [papeleta, setPapeleta] = useState('');
  const [estadoPapeleta, setEstadoPapeleta] = useState<string | null>(null);
  const [fechaPapeletaEncontrada, setFechaPapeletaEncontrada] = useState<string | null>(null);
  const [fechaNuevaPapeleta, setFechaNuevaPapeleta] = useState('');

  // --- ESTADOS: USUARIOS ---
  const [busquedaRemitente, setBusquedaRemitente] = useState('');
  const [remitentes, setRemitentes] = useState<any[]>([]);
  
  const [busquedaDestinatario, setBusquedaDestinatario] = useState('');
  const [destinatarios, setDestinatarios] = useState<any[]>([]);

  // Estado para subrayar el nombre seleccionado al darle clic
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
            <strong key={i} className="font-black text-[1.15em] text-blue-900 bg-blue-100 px-1 rounded">
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
  const limpiarPapeleta = () => {
    setPapeleta('');
    setEstadoPapeleta(null);
    setFechaPapeletaEncontrada(null);
    setFechaNuevaPapeleta('');
  };

  // ESTA ES LA FUNCIÓN CORREGIDA
  const manejarEscaneoPapeleta = async (valorEscrito: string) => {
    setPapeleta(valorEscrito); // Guardamos lo que el usuario escribe inmediatamente para que no se congele

    if (valorEscrito.length < 3) {
      setEstadoPapeleta(null);
      setFechaPapeletaEncontrada(null);
      return;
    }

    // Buscamos en la base de datos sin alterar el texto que está escribiendo
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

    if (!error) setEstadoPapeleta('USADA');
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

  // --- LÓGICA: ABRIR MODAL PARA EDITAR ---
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

  // --- LÓGICA: GUARDAR O ACTUALIZAR CLIENTE ---
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
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* HEADER */}
      <header className="mb-6 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">BÚSQUEDA DE USUARIOS</h1>
          <p className="text-gray-500">Módulo de Inspectores</p>
        </div>
        <button 
          onClick={() => {
            setFormData(formInicial);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </header>

      {/* MÓDULO PAPELETAS */}
      <section className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-700">Verificación Rápida de Papeletas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-4 text-gray-400" size={24} />
          <input
            type="text"
            placeholder="Escanear o digitar número de papeleta..."
            className="w-full pl-12 pr-12 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-600 text-2xl uppercase font-bold transition-colors"
            value={papeleta}
            onChange={(e) => manejarEscaneoPapeleta(e.target.value)}
          />
          {papeleta && (
            <button 
              onClick={limpiarPapeleta} 
              className="absolute right-3 top-4 text-gray-400 hover:text-gray-700 transition-colors"
              title="Limpiar escáner"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* ALERTA: ÉXITO AL GUARDAR NUEVA */}
        {estadoPapeleta === 'GUARDADO_EXITO' && (
          <div className="mt-4 p-6 bg-blue-50 border-4 border-blue-500 rounded-xl flex items-center justify-between text-blue-800 animate-pulse">
            <div className="flex items-center gap-4">
              <CheckCircle size={48} className="text-blue-600" />
              <div>
                <h3 className="font-black text-3xl">🔵 GUARDADO EXITOSO</h3>
                <p className="text-xl font-bold mt-1 text-blue-900">La papeleta se registró y se marcó como USADA.</p>
              </div>
            </div>
            <button onClick={limpiarPapeleta} className="text-blue-500 hover:text-blue-800" title="Cerrar">
              <X size={32} />
            </button>
          </div>
        )}

        {/* ALERTA ROJA (USADA HISTÓRICA) */}
        {estadoPapeleta === 'USADA' && (
          <div className="mt-4 p-6 bg-red-100 border-4 border-red-500 rounded-xl flex items-center gap-4 text-red-800">
            <XCircle size={48} />
            <div>
              <h3 className="font-black text-3xl">🔴 PAPELETA YA UTILIZADA</h3>
              {fechaPapeletaEncontrada && (
                <p className="text-xl font-bold mt-1 text-red-900">Fecha del depósito: {fechaPapeletaEncontrada}</p>
              )}
            </div>
          </div>
        )}

        {/* ALERTA VERDE (DISPONIBLE) */}
        {estadoPapeleta === 'DISPONIBLE' && (
          <div className="mt-4 p-6 bg-green-100 border-4 border-green-500 rounded-xl flex items-center justify-between text-green-800">
            <div className="flex items-center gap-4">
              <CheckCircle size={48} />
              <div>
                <h3 className="font-black text-3xl">🟢 PAPELETA DISPONIBLE</h3>
                {fechaPapeletaEncontrada && (
                  <p className="text-xl font-bold mt-1 text-green-900">Fecha del depósito: {fechaPapeletaEncontrada}</p>
                )}
              </div>
            </div>
            <button onClick={marcarPapeletaComoUsada} className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-sm">
              Marcar como Usada
            </button>
          </div>
        )}

        {/* ALERTA AMARILLA (NO REGISTRADA) */}
        {estadoPapeleta === 'NO_ENCONTRADA' && (
          <div className="mt-4 p-6 bg-yellow-50 border-4 border-yellow-400 rounded-xl shadow-inner">
            <div className="flex items-center gap-4 text-yellow-800 mb-4">
              <AlertTriangle size={40} />
              <div>
                <h3 className="font-black text-2xl">🟡 PAPELETA NO REGISTRADA</h3>
                <p className="text-yellow-700 font-medium">Ingresa la fecha para registrarla y utilizarla inmediatamente.</p>
              </div>
            </div>
            <div className="flex gap-4 items-end bg-white p-4 rounded-lg border border-yellow-200 shadow-sm">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha del depósito de esta papeleta:</label>
                <input 
                  type="date" 
                  className="w-full p-3 border rounded-lg focus:outline-none focus:border-yellow-500 font-bold"
                  value={fechaNuevaPapeleta}
                  onChange={(e) => setFechaNuevaPapeleta(e.target.value)}
                />
              </div>
              <button onClick={registrarNuevaPapeleta} className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg font-bold shadow-sm transition-colors">
                Guardar y Utilizar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* MÓDULO BÚSQUEDA USUARIOS */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Remitente (Azul) */}
        <section className="bg-blue-50 p-6 rounded-xl shadow-sm border-2 border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-800">Remitente</h2>
            <button onClick={() => limpiarBusqueda('REMITENTE')} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-bold px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors">
              <Eraser size={16} /> Limpiar
            </button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3.5 text-blue-400" size={20} />
            <input
              type="text"
              placeholder="Buscar remitente (Nombre, RUC, Teléfono)..."
              className="w-full pl-10 pr-10 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg shadow-inner"
              value={busquedaRemitente}
              onChange={(e) => {
                setBusquedaRemitente(e.target.value);
                buscarUsuarios(e.target.value, 'REMITENTE', setRemitentes);
              }}
            />
            {busquedaRemitente && (
              <button onClick={() => limpiarBusqueda('REMITENTE')} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-700"><X size={20}/></button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left bg-white rounded-lg overflow-hidden shadow-sm text-sm">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="p-3">Nombre / Razón Social</th>
                  <th className="p-3">Cédula / RUC</th>
                  <th className="p-3">Isla</th>
                  <th className="p-3">Dirección</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Correo</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {remitentes.length === 0 ? (
                  <tr className="border-b text-gray-500 text-center">
                    <td colSpan={7} className="p-4">{busquedaRemitente.length < 2 ? "Escribe para buscar..." : "Sin resultados"}</td>
                  </tr>
                ) : (
                  remitentes.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-blue-50 transition-colors">
                      <td 
                        className={`p-3 cursor-pointer transition-all ${usuarioSeleccionadoId === u.id ? 'underline decoration-4 underline-offset-4 decoration-blue-600' : ''}`}
                        onClick={() => setUsuarioSeleccionadoId(u.id)}
                      >
                        {resaltarTexto(u.nombre_razon_social, busquedaRemitente)}
                      </td>
                      <td className="p-3">{resaltarTexto(u.cedula_ruc || '-', busquedaRemitente)}</td>
                      <td className="p-3">{u.isla || '-'}</td>
                      <td className="p-3">{u.direccion || '-'}</td>
                      <td className="p-3">{resaltarTexto(u.telefono || '-', busquedaRemitente)}</td>
                      <td className="p-3">{u.correo || '-'}</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => abrirModalEditar(u)}
                          className="p-2 bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600 rounded border border-gray-200" 
                          title="Editar"
                        >
                          <Edit size={18} />
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
        <section className="bg-green-50 p-6 rounded-xl shadow-sm border-2 border-green-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-green-800">Destinatario</h2>
            <button onClick={() => limpiarBusqueda('DESTINATARIO')} className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-bold px-3 py-1 rounded bg-green-100 hover:bg-green-200 transition-colors">
              <Eraser size={16} /> Limpiar
            </button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3.5 text-green-400" size={20} />
            <input
              type="text"
              placeholder="Buscar destinatario (Nombre, RUC, Teléfono)..."
              className="w-full pl-10 pr-10 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:border-green-500 text-lg shadow-inner"
              value={busquedaDestinatario}
              onChange={(e) => {
                setBusquedaDestinatario(e.target.value);
                buscarUsuarios(e.target.value, 'DESTINATARIO', setDestinatarios);
              }}
            />
            {busquedaDestinatario && (
              <button onClick={() => limpiarBusqueda('DESTINATARIO')} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-700"><X size={20}/></button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left bg-white rounded-lg overflow-hidden shadow-sm text-sm">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="p-3">Nombre / Razón Social</th>
                  <th className="p-3">Cédula / RUC</th>
                  <th className="p-3">Isla</th>
                  <th className="p-3">Dirección</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Correo</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {destinatarios.length === 0 ? (
                  <tr className="border-b text-gray-500 text-center">
                    <td colSpan={7} className="p-4">{busquedaDestinatario.length < 2 ? "Escribe para buscar..." : "Sin resultados"}</td>
                  </tr>
                ) : (
                  destinatarios.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-green-50 transition-colors">
                      <td 
                        className={`p-3 cursor-pointer transition-all ${usuarioSeleccionadoId === u.id ? 'underline decoration-4 underline-offset-4 decoration-green-600' : ''}`}
                        onClick={() => setUsuarioSeleccionadoId(u.id)}
                      >
                        {resaltarTexto(u.nombre_razon_social, busquedaDestinatario)}
                      </td>
                      <td className="p-3">{resaltarTexto(u.cedula_ruc || '-', busquedaDestinatario)}</td>
                      <td className="p-3">{u.isla || '-'}</td>
                      <td className="p-3">{u.direccion || '-'}</td>
                      <td className="p-3">{resaltarTexto(u.telefono || '-', busquedaDestinatario)}</td>
                      <td className="p-3">{u.correo || '-'}</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => abrirModalEditar(u)}
                          className="p-2 bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600 rounded border border-gray-200" 
                          title="Editar"
                        >
                          <Edit size={18} />
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

      {/* MODAL NUEVO / EDITAR CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold">{formData.id ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData(formInicial);
                }} 
                className="hover:bg-blue-700 p-1 rounded"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre / Razón Social *</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none" 
                  value={formData.nombre_razon_social} onChange={(e)=>setFormData({...formData, nombre_razon_social: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Cédula / RUC</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none" 
                  value={formData.cedula_ruc} onChange={(e)=>setFormData({...formData, cedula_ruc: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none" 
                  value={formData.telefono} onChange={(e)=>setFormData({...formData, telefono: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Isla</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none" 
                  value={formData.isla} onChange={(e)=>setFormData({...formData, isla: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Cliente</label>
                <select className="w-full p-2 border rounded focus:border-blue-500 outline-none"
                  value={formData.tipo} onChange={(e)=>setFormData({...formData, tipo: e.target.value})}>
                  <option value="REMITENTE">Solo Remitente</option>
                  <option value="DESTINATARIO">Solo Destinatario</option>
                  <option value="AMBOS">Remitente y Destinatario</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Dirección</label>
                <input type="text" className="w-full p-2 border rounded focus:border-blue-500 outline-none" 
                  value={formData.direccion} onChange={(e)=>setFormData({...formData, direccion: e.target.value})} />
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData(formInicial);
                }} 
                className="px-6 py-2 rounded text-gray-600 font-bold hover:bg-gray-200"
              >
                Cancelar
              </button>
              
              <button onClick={guardarCliente} className="px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700">
                {formData.id ? 'Actualizar Cliente' : 'Guardar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
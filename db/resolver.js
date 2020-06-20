const Usuario = require('../models/Usuario')
const Proyecto = require('../models/Proyecto')
const Tarea = require('../models/Tarea')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config({path: 'variables.env'})


const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre} = usuario;

    return jwt.sign({id,email, nombre},secreta, { expiresIn })
}


const resolvers = {
    Query: {
        obtenerProyectos: async (_, {}, ctx)=>{
            const proyectos = await Proyecto.find({ creador: ctx.usuario.id})
            return proyectos;
        },
        obtenerTareas: async (_, {input}, ctx)=>{
            console.log(input)
            console.log(ctx.usuario)
            const tareas = await Tarea.find({ creador: ctx.usuario.id}).where('proyecto').equals(input.proyecto);
            return tareas;
        }
    },
    Mutation: {
        crearUsuario: async (_, {input}) => {
            const {email, password } = input;
            const existeUsuario = await Usuario.findOne({email});
            if(existeUsuario){
                throw new Error('El usuario ya existe')
            }
            try {
                //hashear password
                const salt = await bcryptjs.genSalt(10)
                input.password = await bcryptjs.hash(password, salt)
                //Registrar nuevo usuario
                const nuevoUsuario = new Usuario(input)
                console.log(nuevoUsuario)
                nuevoUsuario.save();
                return "Usuario Creado correctamente"
            } catch (error) {
                console.log(error)
            }
        },
        autenticarUsuario: async (_,{input}) => {
            const {email, password } = input;
            const existeUsuario = await Usuario.findOne({email});
            if(!existeUsuario){
                throw new Error('El usuario no existe')
            }
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password )
            if(!passwordCorrecto){
                throw new Error('Password incorrecto')
            }

            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '6hr' )
            }
        },
        nuevoProyecto: async (_,{input}, ctx) => {
            console.log('desde resolver ',ctx)
            try {
                const proyecto = Proyecto(input);

                proyecto.creador = ctx.usuario.id;
                const resultado = await proyecto.save()
                return resultado;
            } catch (error) {
                console.log(error)
            }
        },
        actualizarProyecto: async (_,{id,input}, ctx) => {
            let proyecto = await Proyecto.findById(id);
            if(!proyecto){
                throw new Error('Proyecto no encontrado')
            }

            if(proyecto.creador.toString()!==ctx.usuario.id){
                throw new Error('No tienes las credenciales para editar')
            }

            proyecto = await Proyecto.findByIdAndUpdate({_id: id}, input, {new: true})
            return proyecto;
        },
        eliminarProyecto: async (_,{id}, ctx) => { 
            let proyecto = await Proyecto.findById(id);
            if(!proyecto){
                throw new Error('Proyecto no encontrado')
            }

            if(proyecto.creador.toString()!==ctx.usuario.id){
                throw new Error('No tienes las credenciales para editar')
            }

            await Proyecto.findByIdAndDelete({_id: id})
            return "proyecto eliminado";
        },
        nuevaTarea: async (_,{input}, ctx) => {
            try {
                const tarea = Tarea(input);
                tarea.creador = ctx.usuario.id;
                const resultado = await tarea.save()
                return resultado;
            } catch (error) {
                console.log(error)
            }
        },
        actualizarTarea: async (_,{id,input, estado}, ctx) => {
            let tarea = await Tarea.findById(id);
            if(!tarea){
                throw new Error('Tarea no encontrada')
            }

            if(tarea.creador.toString()!==ctx.usuario.id){
                throw new Error('No tienes las credenciales para editar')
            }

            input.estado = estado;

            tarea = await Tarea.findByIdAndUpdate({_id: id}, input, {new: true})
            return tarea;
        },
        eliminarTarea: async (_,{id}, ctx) => { 
            let tarea = await Tarea.findById(id);
            if(!tarea){
                throw new Error('Tarea no encontrado')
            }

            if(tarea.creador.toString()!==ctx.usuario.id){
                throw new Error('No tienes las credenciales para editar')
            }

            await Tarea.findByIdAndDelete({_id: id})
            return "tarea eliminada";
        }
    }
}

module.exports = resolvers;
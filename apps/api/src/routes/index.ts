import { Router } from 'express'
import authRouter from './auth.js'
import adminRouter from './admin.js'
import rawMaterialsRouter from './raw-materials.js'
import lotsRouter from './lots.js'
import heatingRouter from './heating.js'
import processesRouter from './processes.js'
import shipmentsRouter from './shipments.js'
import qualityRouter from './quality.js'
import aiAgentsRouter from './ai-agents.js'
import kpiRouter from './kpi.js'
import dashboardRouter from './dashboard.js'
import equipmentRouter from './equipment.js'
import heatingOptimizeRouter from './heating-optimize.js'
import heatingRecipesRouter from './heating-recipes.js'
import referenceInfoRouter from './reference-info.js'
import dataManagementRouter from './data-management.js'
import dataSourcesRouter from './data-sources.js'
import dataVisualizationRouter from './data-visualization.js'
import dataExportRouter from './data-export.js'
import aiDatasetsRouter from './ai-datasets.js'
import processConditionsRouter from './process-conditions.js'

export const router = Router()

router.use('/auth', authRouter)
router.use('/admin', adminRouter)
router.use('/raw-materials', rawMaterialsRouter)
router.use('/lots', lotsRouter)
router.use('/heating-processes', heatingRouter)
router.use('/heating-recipes', heatingRecipesRouter)
router.use('/heating', heatingOptimizeRouter)
router.use('/process-results', processesRouter)
router.use('/work-orders', processesRouter)
router.use('/shipments', shipmentsRouter)
router.use('/quality-inspections', qualityRouter)
router.use('/ai-agents', aiAgentsRouter)
router.use('/kpi', kpiRouter)
router.use('/dashboard', dashboardRouter)
router.use('/equipment', equipmentRouter)

// 기준정보관리
router.use('/reference-info', referenceInfoRouter)

// 데이터관리
router.use('/data-management', dataManagementRouter)
router.use('/data-sources', dataSourcesRouter)
router.use('/data-visualization', dataVisualizationRouter)
router.use('/data-export', dataExportRouter)
router.use('/ai-datasets', aiDatasetsRouter)
router.use('/process-conditions', processConditionsRouter)

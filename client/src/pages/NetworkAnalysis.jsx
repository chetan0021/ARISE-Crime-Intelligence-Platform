import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Users, GitBranch, MapPin, DollarSign, FileText, Eye, EyeOff, Zap, Search, ZoomIn, ZoomOut, RotateCcw, ChevronRight, Shield, AlertTriangle, Brain, Loader2 } from 'lucide-react'
import { useT } from '../i18n/useT'
import { useLang } from '../context/LanguageContext'

const NODE_CONFIG = {
  OFFENDER: {
    color: '#fafafa',
    emissive: 0xffd86a,
    emissiveIntensity: 0.7,
    strokeColor: '#d97706',
    radius: (d) => 1.1 + (d.riskScore || 0) * 0.9,
    shape: 'sphere',
    label: 'Offender'
  },
  FIR: {
    color: '#22d3ee',
    emissive: 0x22d3ee,
    emissiveIntensity: 0.9,
    strokeColor: '#0891b2',
    radius: () => 0.9,
    shape: 'box',
    label: 'FIR / Case'
  },
  VICTIM: {
    color: '#f43f5e',
    emissive: 0xf43f5e,
    emissiveIntensity: 0.9,
    strokeColor: '#e11d48',
    radius: () => 0.85,
    shape: 'octahedron',
    label: 'Victim'
  },
  LOCATION: {
    color: '#00ffaa',
    emissive: 0x00ffaa,
    emissiveIntensity: 0.9,
    strokeColor: '#16a34a',
    radius: (d) => 0.85 + (d.firCount || 1) * 0.2,
    shape: 'cone',
    label: 'Location'
  },
  MOBILE: {
    color: '#a78bfa', emissive: 0xa78bfa, emissiveIntensity: 0.9, strokeColor: '#7c3aed',
    radius: () => 0.7, shape: 'sphere', label: 'Mobile'
  },
  UPI_ID: {
    color: '#a78bfa', emissive: 0xa78bfa, emissiveIntensity: 0.9, strokeColor: '#7c3aed',
    radius: () => 0.7, shape: 'sphere', label: 'UPI ID'
  },
  BANK_ACCOUNT: {
    color: '#a78bfa', emissive: 0xa78bfa, emissiveIntensity: 0.9, strokeColor: '#7c3aed',
    radius: () => 0.7, shape: 'sphere', label: 'Bank Account'
  },
  CRYPTO_WALLET: {
    color: '#a78bfa', emissive: 0xa78bfa, emissiveIntensity: 0.9, strokeColor: '#7c3aed',
    radius: () => 0.7, shape: 'sphere', label: 'Crypto'
  },
  NER_PERSON: {
    color: '#fb923c', emissive: 0xfb923c, emissiveIntensity: 0.9, strokeColor: '#ea580c',
    radius: () => 0.6, shape: 'sphere', label: 'Discovered Person'
  },
  NER_LOCATION: {
    color: '#34d399', emissive: 0x34d399, emissiveIntensity: 0.9, strokeColor: '#059669',
    radius: () => 0.6, shape: 'sphere', label: 'Discovered Location'
  },
  NER_ORGANIZATION: {
    color: '#c084fc', emissive: 0xc084fc, emissiveIntensity: 0.9, strokeColor: '#9333ea',
    radius: () => 0.6, shape: 'sphere', label: 'Discovered Org'
  }
}

const getNodeConfig = (type) =>
  NODE_CONFIG[type] || {
    color: '#71717a', emissive: 0x71717a, emissiveIntensity: 0.5, strokeColor: '#71717a',
    radius: () => 0.6, shape: 'sphere', label: type
  }

const EDGE_COLORS = {
  CO_ACCUSED: '#ffffff',
  'CO-OFFENDER': '#ffffff',
  ACCUSED_IN: '#ffffff',
  VICTIM_OF: '#f43f5e',
  ASSOCIATE: '#fb923c',
  CONDUIT: '#a78bfa',
  HANDLER: '#ef4444',
  FAMILY: '#00ffaa',
  LOCATION_OF: '#22d3ee',
  MENTIONED_IN: '#71717a',
  HIDDEN: '#3f3f46'
}

const BNS_LABELS = {
  'BNS-303': 'Theft',
  'BNS-309(4)': 'Robbery · Snatching',
  'BNS-318(4)': 'Cyber Fraud',
  'BNS-331(3)': 'Housebreaking · Night',
  'BNS-115': 'Assault',
}

function makeGeometry(shape, radius) {
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(radius * 1.4, radius * 1.4, radius * 1.4)
    case 'octahedron':
      return new THREE.OctahedronGeometry(radius, 0)
    case 'cone':
      return new THREE.ConeGeometry(radius, radius * 1.8, 8)
    case 'sphere':
    default:
      return new THREE.SphereGeometry(radius, 24, 24)
  }
}

const DraggableCard = ({ initialLeft, initialTop, children, title, width = 180 }) => {
  const [pos, setPos] = useState({ x: initialLeft, y: initialTop })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef(null)

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId)
    setIsDragging(true)
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }
  const handlePointerMove = (e) => {
    if (!isDragging || !dragStart.current) return
    setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
  }
  const handlePointerUp = (e) => {
    setIsDragging(false)
    e.target.releasePointerCapture(e.pointerId)
  }

  return (
    <div style={{
      position: 'absolute', left: pos.x, top: pos.y, zIndex: 40,
      background: 'rgba(8, 12, 22, 0.65)', backdropFilter: 'blur(18px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, width,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <div 
        onPointerDown={handlePointerDown} 
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', userSelect: 'none', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      <div style={{ padding: 14 }}>
        {children}
      </div>
    </div>
  )
}

export default function NetworkAnalysis() {
  const t = useT()
  const { lang } = useLang()

  const [graphData, setGraphData] = useState({ nodes: [], edges: [], hiddenLinks: [], ziaDiscovered: [], meta: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [offenderDetail, setOffenderDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showHiddenLinks, setShowHiddenLinks] = useState(false)
  const [showNERNodes, setShowNERNodes] = useState(true)
  const [activeFilters, setActiveFilters] = useState({
    OFFENDER: true, FIR: true, VICTIM: true,
    LOCATION: true, FINANCIAL: true, NER: true
  })

  const [focusNodeId, setFocusNodeId] = useState(null)
  const [inspectorTab, setInspectorTab] = useState('overview')
  const [autoRotate, setAutoRotate] = useState(true)

  const mountRef = useRef(null)
  const threeState = useRef(null)
  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())
  const hoveredId = useRef(null)

  const VITE_API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';

  const fetchGraphData = useCallback(async (nodeId = null) => {
    setLoading(true)
    setError(null)
    try {
      let url = `${VITE_API_BASE}/api/network-graph?active_only=true`
      if (nodeId) url += `&node=${nodeId}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setGraphData(json.data)
      } else {
        throw new Error(json.error || 'Failed to load network graph')
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [VITE_API_BASE])

  useEffect(() => {
    fetchGraphData(focusNodeId)
  }, [fetchGraphData, focusNodeId])

  const visibleNodes = useMemo(() => {
    const nodes = graphData.nodes || []
    return nodes.filter(node => {
      if (node.type === 'OFFENDER') return activeFilters.OFFENDER
      if (node.type === 'FIR') return activeFilters.FIR
      if (node.type === 'VICTIM') return activeFilters.VICTIM
      if (node.type === 'LOCATION') return activeFilters.LOCATION
      if (['MOBILE', 'UPI_ID', 'BANK_ACCOUNT', 'CRYPTO_WALLET'].includes(node.type)) return activeFilters.FINANCIAL
      if (node.type.startsWith('NER_')) return activeFilters.NER && showNERNodes
      return true
    })
  }, [graphData.nodes, activeFilters, showNERNodes])

  const visibleLinks = useMemo(() => {
    const visIds = new Set(visibleNodes.map(n => n.id))
    const edges = graphData.edges || []
    const base = edges.filter(e => {
      const s = e.source_entity_id || e.source
      const t = e.target_entity_id || e.target
      return visIds.has(s) && visIds.has(t)
    }).map(e => ({
      ...e,
      source: e.source_entity_id || e.source,
      target: e.target_entity_id || e.target
    }))
    const hidden = (showHiddenLinks && graphData.hiddenLinks)
      ? graphData.hiddenLinks.filter(h => visIds.has(h.sourceId) && visIds.has(h.targetId)).map(h => ({
          source: h.sourceId,
          target: h.targetId,
          relationship_type: 'HIDDEN',
          relationship_strength: h.strength || 0.3,
          hidden: true,
          via: h.via
        }))
      : []
    return [...base, ...hidden]
  }, [visibleNodes, graphData.edges, graphData.hiddenLinks, showHiddenLinks])

  const searchMatch = useCallback((node) => {
    if (!searchTerm) return null
    const term = searchTerm.toLowerCase()
    const label = (node.label || node.id || '').toString().toLowerCase()
    const sub = (node.subLabel || '').toString().toLowerCase()
    if (label.includes(term) || sub.includes(term)) return true
    return false
  }, [searchTerm])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.FogExp2(0x000000, 0.000) // Transparent when zooming out

    const width = mount.clientWidth || 800
    const height = mount.clientHeight || 600
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 5000)
    camera.position.set(0, 60, 140)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 1)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.7
    controls.zoomSpeed = 0.9
    controls.minDistance = 8
    controls.maxDistance = 600
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.4

    const ambient = new THREE.AmbientLight(0x4a5568, 0.5)
    scene.add(ambient)
    const keyLight = new THREE.PointLight(0x22d3ee, 1.4, 400, 1.6)
    keyLight.position.set(60, 80, 60)
    scene.add(keyLight)
    const fillLight = new THREE.PointLight(0xa78bfa, 1.0, 400, 1.6)
    fillLight.position.set(-70, 40, -60)
    scene.add(fillLight)
    const rimLight = new THREE.PointLight(0xf97316, 0.7, 400, 1.8)
    rimLight.position.set(0, -60, 80)
    scene.add(rimLight)

    const starsGeom = new THREE.BufferGeometry()
    const starCount = 1200
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 300 + Math.random() * 300
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i * 3 + 2] = r * Math.cos(phi)
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const stars = new THREE.Points(starsGeom, new THREE.PointsMaterial({ color: 0x0ea5e9, size: 0.6, transparent: true, opacity: 0.55, depthWrite: false }))
    scene.add(stars)

    const gridHelper = new THREE.GridHelper(240, 24, 0x0891b2, 0x064e3b)
    gridHelper.material.opacity = 0.15
    gridHelper.material.transparent = true
    scene.add(gridHelper)

    const nodeGroup = new THREE.Group()
    const edgeGroup = new THREE.Group()
    const labelGroup = new THREE.Group()
    scene.add(edgeGroup)
    scene.add(nodeGroup)
    scene.add(labelGroup)

    threeState.current = {
      scene, camera, renderer, controls,
      nodeGroup, edgeGroup, labelGroup,
      meshes: [], edges: [], labels: [],
      nodesByMesh: new Map(),
      anim: null, disposed: false
    }

    let animRunning = true
    const tick = () => {
      if (!threeState.current || threeState.current.disposed) { animRunning = false; return }
      threeState.current.controls.update()
      threeState.current.renderer.render(scene, camera)
      if (animRunning) requestAnimationFrame(tick)
    }
    tick()

    const handleResize = () => {
      if (!mount || !threeState.current) return
      const w = mount.clientWidth || 800
      const h = mount.clientHeight || 600
      threeState.current.camera.aspect = w / h
      threeState.current.camera.updateProjectionMatrix()
      threeState.current.renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    const handlePointerMove = (event) => {
      if (!threeState.current) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      try {
        raycaster.current.setFromCamera(pointer.current, camera)
        const intersects = raycaster.current.intersectObjects(nodeGroup.children, false)
        if (intersects.length > 0) {
          const obj = intersects[0].object
          const node = threeState.current.nodesByMesh.get(obj)
          if (node) {
            const id = node.id
            if (hoveredId.current !== id) {
              hoveredId.current = id
              renderer.domElement.style.cursor = 'pointer'
            }
          }
        } else {
          hoveredId.current = null
          renderer.domElement.style.cursor = 'grab'
        }
      } catch (e) { /* ignore */ }
    }
    renderer.domElement.style.cursor = 'grab'
    renderer.domElement.addEventListener('pointermove', handlePointerMove)

    const handleClick = (event) => {
      if (!threeState.current) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.current.setFromCamera(pointer.current, camera)
      const intersects = raycaster.current.intersectObjects(nodeGroup.children, false)
      if (intersects.length > 0) {
        const obj = intersects[0].object
        const node = threeState.current.nodesByMesh.get(obj)
        if (node) {
          setSelectedNode(node)
          setInspectorTab('overview')
          if (node.type === 'OFFENDER') {
            setDetailLoading(true)
            fetch(`${VITE_API_BASE}/api/network-graph/offender/${node.id}`)
              .then(r => r.json())
              .then(json => {
                setOffenderDetail(json.data)
                setDetailLoading(false)
              })
              .catch(() => setDetailLoading(false))
          } else {
            setOffenderDetail(null)
          }
          return
        }
      }
      setSelectedNode(null)
      setOffenderDetail(null)
    }
    renderer.domElement.addEventListener('click', handleClick)

    threeState.current.cleanup = () => {
      animRunning = false
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('click', handleClick)
    }

    return () => {
      if (threeState.current && threeState.current.cleanup) threeState.current.cleanup()
      threeState.current && (threeState.current.disposed = true)
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (threeState.current) threeState.current.controls.autoRotate = autoRotate
  }, [autoRotate])

  useEffect(() => {
    const st = threeState.current
    if (!st) return

    while (st.nodeGroup.children.length) st.nodeGroup.remove(st.nodeGroup.children[0])
    while (st.edgeGroup.children.length) st.edgeGroup.remove(st.edgeGroup.children[0])
    while (st.labelGroup.children.length) st.labelGroup.remove(st.labelGroup.children[0])
    st.meshes = []; st.edges = []; st.labels = []; st.nodesByMesh.clear()

    const N = visibleNodes.length
    if (N === 0) return

    const idToIndex = new Map()
    visibleNodes.forEach((node, i) => { idToIndex.set(node.id, i) })

    const positions = new Float32Array(N * 3)
    const velocities = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 12 + Math.random() * 8
      const phi = Math.acos(2 * Math.random() - 1)
      const theta = Math.random() * Math.PI * 2
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      velocities[i * 3 + 0] = 0
      velocities[i * 3 + 1] = 0
      velocities[i * 3 + 2] = 0
    }

    const linkList = visibleLinks.map(l => ({
      s: idToIndex.get(l.source),
      t: idToIndex.get(l.target),
      strength: l.hidden ? 0.08 : (l.relationship_strength || 0.45),
      distance: l.hidden ? 60 : (l.relationship_type === 'CO_ACCUSED' || l.relationship_type === 'CO-OFFENDER' || l.relationship_type === 'ACCUSED_IN' ? 22 : 34)
    })).filter(l => l.s !== undefined && l.t !== undefined && l.s !== l.t)

    visibleNodes.forEach((node, i) => {
      const cfg = getNodeConfig(node.type)
      const radius = cfg.radius(node)
      const geom = makeGeometry(cfg.shape, radius)
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cfg.color),
        emissive: new THREE.Color(cfg.emissive),
        emissiveIntensity: (cfg.emissiveIntensity || 0.7) * 1.5, // Increased glow
        metalness: 0.35,
        roughness: 0.25,
        transparent: true,
        opacity: 1.0 // Fully opaque core
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.set(positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2])
      mesh.castShadow = true
      mesh.receiveShadow = false
      st.nodeGroup.add(mesh)
      st.meshes.push(mesh)
      st.nodesByMesh.set(mesh, node)

      const ringGeom = new THREE.RingGeometry(radius * 1.35, radius * 1.6, 48)
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.color), side: THREE.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false }) // Increased ring glow
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.lookAt(st.camera.position)
      ring.position.copy(mesh.position)
      st.nodeGroup.add(ring)
      st.meshes.push(ring)
      st.nodesByMesh.set(ring, node)

      const labelCanvas = document.createElement('canvas')
      const ctx = labelCanvas.getContext('2d')
      const labelText = (node.label || node.id || '').toString()
      const maxLen = node.type === 'OFFENDER' ? 18 : 14
      const display = labelText.length > maxLen ? labelText.slice(0, maxLen) + '…' : labelText
      ctx.font = node.type === 'OFFENDER' ? 'bold 40px Inter, Arial' : '400 34px Inter, Arial'
      const w = Math.max(120, Math.min(520, ctx.measureText(display).width + 32))
      labelCanvas.width = w
      labelCanvas.height = 64
      const ctx2 = labelCanvas.getContext('2d')
      ctx2.clearRect(0, 0, w, 64)
      ctx2.fillStyle = 'rgba(5, 10, 20, 0.55)'
      ctx2.fillRect(0, 0, w, 64)
      ctx2.strokeStyle = cfg.color
      ctx2.globalAlpha = 0.35
      ctx2.lineWidth = 2
      ctx2.strokeRect(1, 1, w - 2, 62)
      ctx2.globalAlpha = 1
      ctx2.fillStyle = node.type === 'OFFENDER' ? '#ffffff' : '#cbd5e1'
      ctx2.font = node.type === 'OFFENDER' ? 'bold 28px Inter, Arial' : '500 24px Inter, Arial'
      ctx2.textBaseline = 'middle'
      ctx2.fillText(display, 16, 32)
      const tex = new THREE.CanvasTexture(labelCanvas)
      tex.needsUpdate = true
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true })
      const sprite = new THREE.Sprite(spriteMat)
      const spriteW = (w / 36)
      sprite.scale.set(spriteW, spriteW * (64 / w), 1)
      sprite.position.set(mesh.position.x, mesh.position.y + radius + 1.8, mesh.position.z)
      st.labels.push(sprite)
      st.labelGroup.add(sprite)
    })

    linkList.forEach((l, idx) => {
      const actualLink = visibleLinks[idx] || visibleLinks[0]
      const colorHex = EDGE_COLORS[actualLink?.relationship_type] || EDGE_COLORS.HIDDEN
      const points = []
      const sPos = new THREE.Vector3(positions[l.s * 3 + 0], positions[l.s * 3 + 1], positions[l.s * 3 + 2])
      const tPos = new THREE.Vector3(positions[l.t * 3 + 0], positions[l.t * 3 + 1], positions[l.t * 3 + 2])
      points.push(sPos, tPos)
      const geom = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(colorHex),
        transparent: true,
        opacity: actualLink?.hidden ? 0.15 : 0.55,
        linewidth: 1
      })
      const line = new THREE.Line(geom, mat)
      line.userData = { edgeIndex: idx, sIdx: l.s, tIdx: l.t, link: actualLink }
      st.edgeGroup.add(line)
      st.edges.push(line)

      const glowGeom = new THREE.BufferGeometry().setFromPoints(points)
      const glowMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(colorHex),
        transparent: true,
        opacity: actualLink?.hidden ? 0.04 : 0.08,
        linewidth: 1
      })
      const glowLine = new THREE.Line(glowGeom, glowMat)
      st.edgeGroup.add(glowLine)
      st.edges.push(glowLine)
    })

    const simRunning = { value: true }
    let alpha = 1
    const simStep = () => {
      if (!simRunning.value || !st.meshes.length) return
      alpha = Math.max(0.002, alpha * 0.992)

      const OFFENDER_CHARGE = -90
      const FIR_CHARGE = -55
      const OTHER_CHARGE = -38
      const LINKS_C = 0.06
      const CENTER_C = 0.004
      const DAMP = 0.86

      for (let i = 0; i < N; i++) {
        const ni = visibleNodes[i]
        const ci = (ni.type === 'OFFENDER' ? OFFENDER_CHARGE : ni.type === 'FIR' ? FIR_CHARGE : OTHER_CHARGE)
        for (let j = i + 1; j < N; j++) {
          const dx = positions[i * 3 + 0] - positions[j * 3 + 0]
          const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
          const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
          let dist2 = dx * dx + dy * dy + dz * dz
          if (dist2 < 0.01) dist2 = 0.01
          const dist = Math.sqrt(dist2)
          const nj = visibleNodes[j]
          const cj = (nj.type === 'OFFENDER' ? OFFENDER_CHARGE : nj.type === 'FIR' ? FIR_CHARGE : OTHER_CHARGE)
          const force = (ci * cj * alpha) / (dist2 * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          const fz = (dz / dist) * force
          velocities[i * 3 + 0] += fx; velocities[i * 3 + 1] += fy; velocities[i * 3 + 2] += fz
          velocities[j * 3 + 0] -= fx; velocities[j * 3 + 1] -= fy; velocities[j * 3 + 2] -= fz
        }
      }

      linkList.forEach(l => {
        const s = l.s * 3, t = l.t * 3
        const dx = positions[t + 0] - positions[s + 0]
        const dy = positions[t + 1] - positions[s + 1]
        const dz = positions[t + 2] - positions[s + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01
        const diff = dist - l.distance
        const strength = l.strength * LINKS_C * alpha
        const fx = (dx / dist) * diff * strength
        const fy = (dy / dist) * diff * strength
        const fz = (dz / dist) * diff * strength
        velocities[s + 0] += fx; velocities[s + 1] += fy; velocities[s + 2] += fz
        velocities[t + 0] -= fx; velocities[t + 1] -= fy; velocities[t + 2] -= fz
      })

      for (let i = 0; i < N; i++) {
        const x = positions[i * 3 + 0], y = positions[i * 3 + 1], z = positions[i * 3 + 2]
        velocities[i * 3 + 0] += (-x) * CENTER_C * alpha
        velocities[i * 3 + 1] += (-y) * CENTER_C * alpha * 0.4 + (-Math.max(0, y - 10)) * CENTER_C * alpha * 0.6
        velocities[i * 3 + 2] += (-z) * CENTER_C * alpha
        velocities[i * 3 + 0] *= DAMP
        velocities[i * 3 + 1] *= DAMP
        velocities[i * 3 + 2] *= DAMP
        positions[i * 3 + 0] += velocities[i * 3 + 0]
        positions[i * 3 + 1] += velocities[i * 3 + 1]
        positions[i * 3 + 2] += velocities[i * 3 + 2]
      }

      for (let i = 0, mIdx = 0; i < N; i++) {
        const mesh = st.meshes[mIdx]
        mIdx++
        const ring = st.meshes[mIdx]
        mIdx++
        if (!mesh) continue
        mesh.position.set(positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2])
        mesh.rotation.y += 0.006
        if (ring) {
          ring.position.copy(mesh.position)
          ring.lookAt(st.camera.position)
          ring.rotation.z += 0.01
        }
        const label = st.labels[i]
        if (label) {
          const cfg = getNodeConfig(visibleNodes[i].type)
          const r = cfg.radius(visibleNodes[i])
          label.position.set(mesh.position.x, mesh.position.y + r + 1.8, mesh.position.z)
        }
      }

      st.edges.forEach(line => {
        const ud = line.userData
        if (!ud || ud.sIdx === undefined) return
        const g = line.geometry
        const posAttr = g.attributes.position
        if (!posAttr) return
        posAttr.setXYZ(0, positions[ud.sIdx * 3 + 0], positions[ud.sIdx * 3 + 1], positions[ud.sIdx * 3 + 2])
        posAttr.setXYZ(1, positions[ud.tIdx * 3 + 0], positions[ud.tIdx * 3 + 1], positions[ud.tIdx * 3 + 2])
        posAttr.needsUpdate = true
      })

      if (alpha > 0.004) requestAnimationFrame(simStep)
      else simRunning.value = false
    }
    simStep()

    st._simCleanup = () => { simRunning.value = false }

    return () => {
      simRunning.value = false
    }
  }, [visibleNodes, visibleLinks])

  useEffect(() => {
    const st = threeState.current
    if (!st || !st.meshes.length) return

    const selectedId = selectedNode?.id
    const focusId = focusNodeId

    st.meshes.forEach(mesh => {
      const node = st.nodesByMesh.get(mesh)
      if (!node) return
      const mat = mesh.material
      const isSelected = selectedId && node.id === selectedId
      const isFocused = focusId && (node.id === focusId)
      const matchesSearch = searchMatch(node)
      const dim = (searchTerm && !matchesSearch) || (focusId && !isFocused)
      const isRing = mesh.geometry && (mesh.geometry.type === 'RingGeometry')

      if (isSelected) {
        mat.opacity = 1
        if (mat.emissiveIntensity !== undefined) {
          mat._origEm = mat._origEm ?? mat.emissiveIntensity
          mat.emissiveIntensity = Math.max(mat._origEm * 1.8, 1.6)
        }
        mesh.scale.setScalar(isRing ? 1.6 : 1.25)
      } else if (dim) {
        mat.opacity = isRing ? 0.03 : 0.12
        if (mat._origEm !== undefined) mat.emissiveIntensity = mat._origEm * 0.3
        mesh.scale.setScalar(isRing ? 0.8 : 0.7)
      } else {
        mat.opacity = isRing ? 0.18 : 0.95
        if (mat._origEm !== undefined) mat.emissiveIntensity = mat._origEm
        mesh.scale.setScalar(1)
      }
    })

    st.labels.forEach((sprite, i) => {
      const node = visibleNodes[i]
      if (!node) return
      const isSelected = selectedId && node.id === selectedId
      const isFocused = focusId && node.id === focusId
      const matchesSearch = searchMatch(node)
      const dim = (searchTerm && !matchesSearch) || (focusId && !isFocused)
      if (sprite.material) {
        if (isSelected) sprite.material.opacity = 1
        else if (dim) sprite.material.opacity = 0.08
        else sprite.material.opacity = 0.9
      }
    })

    st.edges.forEach(line => {
      const ud = line.userData
      if (!ud || !ud.link) return
      const mat = line.material
      const sId = ud.link.source
      const tId = ud.link.target
      let conn = false
      if (selectedId && (sId === selectedId || tId === selectedId)) conn = true
      if (focusId && (sId === focusId || tId === focusId)) conn = true
      const isGlow = (line.type === 'Line' && line.material && line.material.opacity < 0.15)
      const baseOp = ud.link.hidden ? 0.15 : 0.55
      if (selectedId || focusId) {
        mat.opacity = conn ? (isGlow ? 0.18 : baseOp * 1.4) : (isGlow ? 0.015 : 0.08)
      } else {
        mat.opacity = isGlow ? (ud.link.hidden ? 0.04 : 0.08) : baseOp
      }
    })
  }, [selectedNode, focusNodeId, searchTerm, searchMatch, visibleNodes, visibleLinks])

  const toggleFilter = (key) => setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }))

  const handleZoom = (factor) => {
    const st = threeState.current
    if (!st) return
    const dir = new THREE.Vector3()
    st.camera.getWorldDirection(dir)
    st.camera.position.addScaledVector(dir, factor > 1 ? -15 : 15)
  }
  const handleResetView = () => {
    const st = threeState.current
    if (!st) return
    st.camera.position.set(0, 60, 140)
    st.controls.target.set(0, 0, 0)
    st.controls.update()
  }

  return (
    <div className="arise-page-enter" style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 30%, #0b1220 0%, #05070d 55%, #000000 100%)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(34,211,238,0.06), transparent 40%), radial-gradient(circle at 80% 80%, rgba(167,139,250,0.05), transparent 40%)' }}></div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          background: 'rgba(8, 12, 22, 0.75)', backdropFilter: 'blur(22px)',
          border: '1px solid rgba(34, 211, 238, 0.18)',
          borderRadius: 12, padding: '8px 14px', display: 'flex', gap: 12, alignItems: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset'
        }}>
          <div style={{ position: 'relative', width: 160 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search node..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', background: 'rgba(2, 6, 16, 0.7)', border: '1px solid rgba(34,211,238,0.22)', borderRadius: 8,
                padding: '5px 10px 5px 30px', fontSize: 12, color: '#fafafa', outline: 'none'
              }}
            />
          </div>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)' }}></div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => toggleFilter('OFFENDER')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeFilters.OFFENDER ? '#fafafa' : '#3f3f46', padding: 4 }} title="Offenders"><Users size={16} /></button>
            <button onClick={() => toggleFilter('FIR')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeFilters.FIR ? '#22d3ee' : '#3f3f46', padding: 4 }} title="FIRs"><FileText size={16} /></button>
            <button onClick={() => toggleFilter('VICTIM')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeFilters.VICTIM ? '#f43f5e' : '#3f3f46', padding: 4 }} title="Victims"><Shield size={16} /></button>
            <button onClick={() => toggleFilter('LOCATION')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeFilters.LOCATION ? '#00ffaa' : '#3f3f46', padding: 4 }} title="Locations"><MapPin size={16} /></button>
            <button onClick={() => toggleFilter('FINANCIAL')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeFilters.FINANCIAL ? '#a78bfa' : '#3f3f46', padding: 4 }} title="Financial / Phone"><DollarSign size={16} /></button>
            <button onClick={() => { toggleFilter('NER'); setShowNERNodes(!showNERNodes) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeFilters.NER ? '#fb923c' : '#3f3f46', padding: 4 }} title="Zia NER Discovered"><Brain size={16} /></button>
          </div>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)' }}></div>

          <button
            onClick={() => setShowHiddenLinks(!showHiddenLinks)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: showHiddenLinks ? '#fafafa' : 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}
          >
            <Zap size={14} /> {t('na.secondDegree')}
          </button>

          <button
            onClick={() => setAutoRotate(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: autoRotate ? 'rgba(34,211,238,0.12)' : 'transparent', border: autoRotate ? '1px solid rgba(34,211,238,0.3)' : 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: autoRotate ? '#22d3ee' : 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}
            title="Auto-rotate molecule view"
          >
            <RotateCcw size={14} /> Spin
          </button>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)' }}></div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => handleZoom(1.2)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ZoomIn size={16} /></button>
            <button onClick={() => handleZoom(0.8)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ZoomOut size={16} /></button>
            <button onClick={() => handleResetView()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><RotateCcw size={16} /></button>
          </div>
        </div>

        <div ref={mountRef} style={{ width: '100%', height: '100%', display: 'block' }}></div>

        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 10,
          background: 'rgba(8, 12, 22, 0.75)', backdropFilter: 'blur(22px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 22, padding: '6px 14px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          color: '#cbd5e1', display: 'flex', gap: 10, alignItems: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}>
          <span>{graphData.meta.nodeCount || 0} nodes · {graphData.meta.edgeCount || 0} edges · {graphData.meta.hiddenLinkCount || 0} hidden links</span>
          {(graphData.ziaDiscovered?.length > 0) && (
            <span style={{ color: '#fb923c' }}>· ✨ {graphData.ziaDiscovered.length} Zia-discovered entities</span>
          )}
          <span style={{ color: '#22d3ee' }}>· drag to rotate · scroll to zoom · right-drag to pan</span>
        </div>

        <DraggableCard initialLeft={16} initialTop={80} title="Node Types" width={200}>
          {Object.entries(NODE_CONFIG).map(([type, cfg]) => {
            const shapeIcon = cfg.shape === 'box' ? '■' : cfg.shape === 'octahedron' ? '◆' : cfg.shape === 'cone' ? '▲' : '●'
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ fontSize: 14, color: cfg.color, textShadow: `0 0 8px ${cfg.color}` }}>{shapeIcon}</div>
                <span style={{ fontSize: 11.5, color: '#cbd5e1' }}>{cfg.label}</span>
              </div>
            )
          })}
        </DraggableCard>

        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 20, backdropFilter: 'blur(6px)' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#22d3ee', marginBottom: 12 }} />
            <div style={{ color: '#cbd5e1', fontSize: 13, letterSpacing: '0.04em' }}>{t('na.building')}</div>
          </div>
        )}
      </div>

      {/* Edge Types Legend as Draggable Card */}
      <DraggableCard initialLeft={16} initialTop={420} title="Edge Types" width={200}>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 22, height: 2, background: color, boxShadow: `0 0 6px ${color}`, borderBottom: type === 'HIDDEN' ? '1px dashed #52525b' : 'none', borderRadius: 1 }}></div>
            <span style={{ fontSize: 11.5, color: '#cbd5e1' }}>{type}</span>
          </div>
        ))}
      </DraggableCard>

      {/* Floating Node Inspector (Only when a node is selected) */}
      {selectedNode && (
        <div style={{ position: 'absolute', right: 16, top: 80, bottom: 20, width: 340, background: 'linear-gradient(180deg, rgba(8,12,22,0.96) 0%, rgba(2,6,16,0.98) 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', zIndex: 30 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: 'rgba(5,10,20,0.8)', zIndex: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 10, height: 10, background: getNodeConfig(selectedNode.type).color,
                borderRadius: getNodeConfig(selectedNode.type).shape === 'sphere' ? '50%' : 2,
                transform: getNodeConfig(selectedNode.type).shape === 'octahedron' ? 'rotate(45deg)' : 'none',
                boxShadow: `0 0 10px ${getNodeConfig(selectedNode.type).color}`
              }}></div>
              <div style={{ fontSize: 10.5, color: getNodeConfig(selectedNode.type).color, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}>
                {getNodeConfig(selectedNode.type).label}
              </div>
            </div>
            <div style={{ fontSize: 16, color: '#fafafa', fontWeight: 700 }}>{selectedNode.label || selectedNode.id}</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{selectedNode.subLabel}</div>
          </div>

        {selectedNode && selectedNode.type === 'OFFENDER' && (
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {['overview', 'cases', 'custody'].map(tab => (
              <button
                key={tab}
                onClick={() => setInspectorTab(tab)}
                style={{
                  flex: 1, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, color: inspectorTab === tab ? '#fafafa' : '#71717a',
                  borderBottom: inspectorTab === tab ? '2px solid #22d3ee' : '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {tab === 'cases' ? t('na.caseHistory') : tab === 'custody' ? t('na.custody') : 'Overview'}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: 16, flex: 1 }}>
          {selectedNode && inspectorTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedNode.type === 'OFFENDER' && (
                <>
                  <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 20,
                    background: 'linear-gradient(160deg, rgba(34,211,238,0.06), rgba(167,139,250,0.06))',
                    borderRadius: 12, border: '1px solid rgba(34,211,238,0.15)'
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recidivism Risk Score</div>
                    <div style={{ position: 'relative', width: 140, height: 70, overflow: 'hidden' }}>
                      <svg width="140" height="140" viewBox="0 0 120 120">
                        <defs>
                          <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00ffaa" />
                            <stop offset="50%" stopColor="#facc15" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                        </defs>
                        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
                        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none"
                          stroke="url(#riskGrad)"
                          strokeWidth="12"
                          strokeDasharray={`${(selectedNode.riskScore || 0) * 157} 157`}
                          style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 24, fontWeight: 800, color: '#fafafa', textShadow: '0 0 14px rgba(34,211,238,0.45)' }}>
                        {Math.round((selectedNode.riskScore || 0) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'rgba(2,6,16,0.6)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prior Arrests</div>
                      <div style={{ fontSize: 18, color: '#fafafa', fontWeight: 700, marginTop: 2 }}>{selectedNode.priorArrests || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(2,6,16,0.6)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rowdy Sheeter</div>
                      <div style={{ fontSize: 18, color: selectedNode.isRowdy ? '#ef4444' : '#fafafa', fontWeight: 700, marginTop: 2 }}>{selectedNode.isRowdy ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {selectedNode.gang && (
                    <div style={{ display: 'inline-block', background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', padding: '5px 10px', borderRadius: 14, fontSize: 11, border: '1px solid rgba(245, 158, 11, 0.25)', width: 'fit-content' }}>
                      Gang: {selectedNode.gang}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (focusNodeId === selectedNode.id) setFocusNodeId(null)
                      else setFocusNodeId(selectedNode.id)
                    }}
                    style={{ width: '100%', padding: '10px', background: focusNodeId === selectedNode.id ? 'rgba(34,211,238,0.1)' : 'transparent', border: '1px solid rgba(34,211,238,0.45)', color: '#22d3ee', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' }}
                  >
                    {focusNodeId === selectedNode.id ? '← Show all connections' : t('na.isolate')}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', opacity: 0.85 }}>View full profile <ChevronRight size={14} /></span>
                  </div>
                </>
              )}

              {selectedNode.type === 'FIR' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    padding: 14, borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(167,139,250,0.06))',
                    border: '1px solid rgba(34,211,238,0.2)'
                  }}>
                    <div style={{ fontSize: 10.5, color: '#7dd3fc', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Section</div>
                    <div style={{ fontSize: 14, color: '#fafafa', fontWeight: 600 }}>{selectedNode.subLabel} {BNS_LABELS[selectedNode.subLabel] ? `· ${BNS_LABELS[selectedNode.subLabel]}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ background: 'rgba(2,6,16,0.6)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: selectedNode.status === 'Open' ? '#ef4444' : '#00ffaa' }}>
                      {selectedNode.status}
                    </div>
                    <div style={{ background: 'rgba(2,6,16,0.6)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#cbd5e1' }}>
                      {selectedNode.district}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: 4, color: '#00ffaa' }} /> {selectedNode.address}
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                    <strong style={{ color: '#fafafa' }}>Complainant:</strong> {selectedNode.complainant}
                  </div>
                </div>
              )}

              {selectedNode.type === 'LOCATION' && (
                <div style={{
                  padding: 16, borderRadius: 12,
                  background: 'linear-gradient(160deg, rgba(0,255,170,0.1), rgba(6,95,70,0.06))',
                  border: '1px solid rgba(0,255,170,0.22)'
                }}>
                  <div style={{ fontSize: 32, color: '#00ffaa', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 0 16px rgba(0,255,170,0.35)' }}>{selectedNode.firCount}</div>
                  <div style={{ fontSize: 12.5, color: '#cbd5e1', marginTop: 4 }}>Linked incidents in {selectedNode.label}</div>
                </div>
              )}

              {['MOBILE', 'UPI_ID', 'BANK_ACCOUNT', 'CRYPTO_WALLET'].includes(selectedNode.type) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#fafafa', background: 'rgba(167,139,250,0.08)', padding: 14, borderRadius: 10, border: '1px solid rgba(167,139,250,0.2)', wordBreak: 'break-all' }}>
                    {selectedNode.label}
                  </div>
                  {selectedNode.bank && <div style={{ fontSize: 12.5, color: '#cbd5e1' }}>Bank: <span style={{ color: '#fafafa' }}>{selectedNode.bank}</span></div>}
                  {selectedNode.operator && <div style={{ fontSize: 12.5, color: '#cbd5e1' }}>Operator: <span style={{ color: '#fafafa' }}>{selectedNode.operator}</span></div>}
                  <div style={{ fontSize: 13, color: '#fafafa' }}>Total Transacted: <span style={{ color: '#00ffaa', fontWeight: 700 }}>₹{selectedNode.amount?.toLocaleString()}</span></div>
                  {selectedNode.flagged && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 12, borderRadius: 10, display: 'flex', gap: 10 }}>
                      <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
                        <strong style={{ color: '#f87171' }}>Flagged:</strong> {selectedNode.flagReason}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.discovered && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fafafa', fontSize: 13, fontWeight: 600 }}>
                    <Brain size={16} style={{ color: '#fb923c' }} /> Zia AI Discovered
                  </div>
                  <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '5px 10px', borderRadius: 6, width: 'fit-content', fontSize: 11.5, color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.22)' }}>
                    Confidence: {Math.round(selectedNode.confidence * 100)}%
                  </div>
                  <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.6 }}>
                    Extracted from FIR narrative using Zia Text Analytics NER.
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedNode && inspectorTab === 'cases' && selectedNode.type === 'OFFENDER' && (
            detailLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 className="animate-spin" color="#22d3ee" /></div> :
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {offenderDetail?.cases?.map(c => (
                  <div key={c.fir_uid} style={{ borderLeft: '2px solid rgba(34,211,238,0.3)', paddingLeft: 14, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -5, top: 4, width: 10, height: 10, borderRadius: '50%', background: c.case_status === 'Open' ? '#ef4444' : '#00ffaa', boxShadow: `0 0 8px ${c.case_status === 'Open' ? '#ef4444' : '#00ffaa'}` }}></div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: '#fafafa', marginBottom: 4 }}>{c.fir_uid}</div>
                    <div style={{ fontSize: 11, color: '#71717a', marginBottom: 8 }}>{new Date(c.fir_registration_datetime).toLocaleDateString()} · {c.district_name}</div>
                    <div style={{ background: 'rgba(2,6,16,0.6)', padding: 11, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 }}>
                      <div style={{ marginBottom: 5 }}><strong style={{ color: '#fafafa' }}>Type:</strong> {c.crime_category || BNS_LABELS[c.bns_primary_section]}</div>
                      <div style={{ color: '#a1a1aa' }}>MO: {c.instrument_used} · {c.time_of_operation}</div>
                    </div>
                  </div>
                ))}
                {(!offenderDetail?.cases || offenderDetail.cases.length === 0) && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12.5, textAlign: 'center', padding: 20 }}>No cases linked</div>
                )}
              </div>
          )}

          {selectedNode && inspectorTab === 'custody' && selectedNode.type === 'OFFENDER' && (
            detailLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 className="animate-spin" color="#22d3ee" /></div> :
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {offenderDetail?.custody?.map((c, i) => (
                  <div key={i} style={{ background: 'rgba(2,6,16,0.6)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.current_status === 'Remand' ? '#ef4444' : '#00ffaa' }}>{c.current_status}</span>
                      <span style={{ fontSize: 11.5, color: '#a1a1aa' }}>{c.bail_type}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#cbd5e1', marginBottom: 4 }}>Court: <span style={{ color: '#fafafa' }}>{c.court_name}</span></div>
                    {c.bail_granted_datetime && <div style={{ fontSize: 11, color: '#71717a' }}>Granted: {new Date(c.bail_granted_datetime).toLocaleDateString()}</div>}
                  </div>
                ))}
                {(!offenderDetail?.custody || offenderDetail.custody.length === 0) && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12.5, textAlign: 'center', padding: 20 }}>No custody records</div>
                )}
              </div>
          )}

          {/* Discoveries and Hidden Links previously shown when !selectedNode */}
        </div>
      </div>
      )}
    </div>
  )
}

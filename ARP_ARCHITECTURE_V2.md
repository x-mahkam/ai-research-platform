# AI Research Platform (ARP) — Architecture Blueprint V2.0

## Executive Overview & Architectural Philosophy

**AI Research Platform (ARP)** is an autonomous **AI Scientific Orchestration Platform** built to execute real-world scientific research loops.

### Core Tenet
> **The AI Agent is the Core.**
> The AI Agent plans, reasons, parameterizes, orchestrates, evaluates, and optimizes scientific research goals. The AI Agent **never** solves physical equations, generates synthetic values, or approximates physical laws. All numerical computations, physical transport calculations, field solvers, and quantum mechanical simulations are delegated strictly to real scientific software packages via standardized plugin adapters.

---

```
                                +----------------------------------+
                                |      Researcher (User Input)     |
                                |  "Optimize bandgap for 2nm GAA"  |
                                +-----------------+----------------+
                                                  |
                                                  v
===================================== AI CORE ORCHESTRATION LAYER =====================================
|                                                                                                     |
|  +---------------------+      +---------------------+      +-------------------------------------+  |
|  |  Research Planner   | ---> | Scientific Reasoner | ---> | Optimization Engine (Bayesian/RL)   |  |
|  +---------------------+      +---------------------+      +-------------------------------------+  |
|                                                                               |                     |
================================================================================|======================
                                                                                v
=================================== SIMULATION ORCHESTRATION LAYER ===================================
|                                                                                                     |
|  +-----------------------------------------------------------------------------------------------+  |
|  |                                  Simulation Orchestrator                                      |  |
|  |  - Workspace Isolator     - Parameter Injector      - Process Monitor                         |  |
|  |  - Plugin Manager         - Execution Runtime       - Artifact Collector                      |  |
|  +----------------------------------------------+------------------------------------------------+  |
|                                                 |                                                   |
==================================================|====================================================
                                                  v
================================ PLUGIN SDK & SCIENTIFIC SOFTWARE LAYER ================================
|                                                                                                     |
|   +-------------------+    +-------------------+    +-------------------+    +-------------------+  |
|   |   COMSOL Adapter  |    |  Sentaurus TCAD   |    | QuantumATK Plugin |    | OpenFOAM / Lumer  |  |
|   |     (.mph)        |    |  (.cmd/.tdr/.par) |    |     (.py/.hdf5)   |    |    (.foam/.fsp)   |  |
|   +---------+---------+    +---------+---------+    +---------+---------+    +---------+---------+  |
|             |                        |                        |                        |            |
|             v                        v                        v                        v            |
|    [ COMSOL Multiphysics ]  [ Synopsys Sentaurus ]   [ QuantumATK Engine ]   [ OpenFOAM Executable ]|
|                                                                                                     |
==================================================|====================================================
                                                  v
================================ RESULT PARSING & EVALUATION FEEDBACK ================================
|                                                                                                     |
|   +----------------------------------------------------------------------------------------------+  |
|   | Result Parser: Extracts Field Data, Scalars, Curves, DataFrames, Tensors                        |  |
|   +----------------------------------------------+-----------------------------------------------+  |
|                                                  |                                                  |
|                                                  v                                                  |
|   +----------------------------------------------------------------------------------------------+  |
|   | Scientific Evaluation: Goal convergence verification -> AI Optimization Feedback Loop       |  |
|   +----------------------------------------------------------------------------------------------+  |
|                                                                                                     |
=======================================================================================================
```

---

## 1. Complete System Architecture

ARP is built on a four-tier architecture:

1. **AI Core Tier**: Contains the LLM reasoning engines, multi-agent planners, optimization loops, and domain-specific knowledge bases.
2. **Orchestration Tier**: Manages job scheduling, execution environments, workspace provisioning, and plugin initialization.
3. **Execution & Plugin Tier**: Hosts the Plugin SDK drivers that communicate with real desktop, HPC cluster, or containerized scientific software binaries.
4. **Data & Storage Tier**: Manages versioned physical model files, run traces, parsed scalar/vector metrics, generated meshes, and final publication-grade Markdown/LaTeX reports.

---

## 2. AI Core Architecture

The AI Core is comprised of five specialized autonomous sub-agents:

1. **Research Planner**:
   - Parses natural language research goals into explicit multi-stage objective functions $f(\mathbf{x})$.
   - Identifies candidate physical simulation solvers based on target physical phenomena (e.g., drift-diffusion vs. DFT vs. Maxwell equations).
2. **Scientific Reasoner**:
   - Analyzes physics constraints, boundary conditions, symmetry rules, and material parameters before simulation launch.
   - Evaluates simulation logs for numerical divergence, mesh singularity, or unphysical results (e.g., negative electron density).
3. **Optimization Engine**:
   - Applies Bayesian Optimization (Gaussian Processes / Expected Improvement), Multi-Objective Pareto Frontier search (NSGA-II), or Gradient Free methods (CMA-ES) to propose next-step parameter set $\mathbf{x}_{k+1}$.
4. **Knowledge Base (RAG)**:
   - Indexes material databases (e.g., bandgaps, dielectric constants, elastic moduli), simulator syntax manuals, mesh quality standards, and prior research run artifacts.
5. **Report Generator**:
   - Compiles objective trajectories, convergence plots, 2D/3D field slices, parameter sensitivity matrices, and scientific citations into publication-ready PDF / Markdown reports.

---

## 3. Simulation Orchestrator Architecture

The **Simulation Orchestrator** is responsible for zero-trust, deterministic execution of external simulation binaries:

* **Workspace Isolator**: Creates isolated transient directory sandboxes (`/workspaces/project_id/runs/run_id/`) for every execution.
* **Parameter Injector**: Replaces variable tokens (e.g., `${GATE_LENGTH}`, `${DOPING_CONC}`) in input files (`.cmd`, `.py`, `.in`, `.m`) without destroying model syntax.
* **Process Monitor**: Tracks PID, CPU utilization, GPU memory usage, stdout/stderr streams, exit codes, and timeout limits.
* **Artifact Collector**: Scans run directories for output files (`.tdr`, `.vtu`, `.dat`, `.csv`, `.mat`, `.hdf5`) and routes them to the Result Parser.

---

## 4. Plugin SDK Specification

Every scientific software driver implements the unified `IScientificSimulatorPlugin` interface:

```typescript
export interface ModelMetadata {
  modelPath: string;
  format: 'mph' | 'cmd' | 'py' | 'fsp' | 'in' | 'm' | 'foam';
  parameters: Array<{
    name: string;
    type: 'float' | 'int' | 'string' | 'enum';
    defaultValue: any;
    unit?: string;
    description?: string;
  }>;
  expectedOutputs: Array<{
    name: string;
    type: 'scalar' | 'curve' | 'field3d' | 'mesh' | 'matrix';
    unit?: string;
  }>;
}

export interface SimulationResult {
  success: boolean;
  exitCode: number;
  wallTimeSeconds: number;
  stdout: string;
  stderr: string;
  scalars: Record<string, number>;
  curves: Record<string, Array<{ x: number; y: number }>>;
  artifactPaths: string[];
  divergenceDetected: boolean;
}

export interface IScientificSimulatorPlugin {
  id: string;
  name: string;
  supportedExtensions: string[];

  discover(environmentPath?: string): Promise<{ available: boolean; version?: string }>;
  validate(modelPath: string): Promise<{ valid: boolean; errors?: string[] }>;
  loadModel(modelPath: string): Promise<ModelMetadata>;
  modifyParameters(modelPath: string, targetPath: string, params: Record<string, any>): Promise<void>;
  run(targetPath: string, options: { timeoutMs: number; cpus: number; gpu: boolean }): Promise<SimulationResult>;
  monitor(pid: number): AsyncIterable<{ progressPercentage: number; logChunk: string }>;
  collectOutputs(runDir: string): Promise<string[]>;
  parse(outputFiles: string[]): Promise<SimulationResult>;
  shutdown(pid: number): Promise<void>;
}
```

---

## 5. Scientific Workflow

1. **Goal Ingestion**: User provides high-level objective (e.g., "Minimize subthreshold swing below 65 mV/dec while keeping $I_{\text{on}} > 1.2\text{ mA}/\mu\text{m}$").
2. **Model Selection**: AI selects target project model (e.g., `nanosheet_3nm.cmd` under Synopsys Sentaurus).
3. **Parameter Extraction**: AI extracts editable parameters ($\text{L}_g$, $T_{\text{sheet}}$, $N_{\text{channel}}$) from model metadata.
4. **Iterative Convergence Loop**:
   - **Propose**: Optimization Engine computes optimal parameters.
   - **Inject**: Parameter Injector writes updated model input script.
   - **Execute**: Orchestrator launches real simulator process.
   - **Parse**: Result Parser reads output binary/text formats (`.tdr`, `.dat`).
   - **Evaluate**: Reasoner checks physics objective and convergence criteria.
5. **Report Generation**: Output final Pareto curves and scientific summary report.

---

## 6. Data Flow

```
[User Objective] ---> (AI Research Planner) ---> [Parameter Set X_k]
                                                        |
                                                        v
                                         (Orchestrator: Injects X_k)
                                                        |
                                                        v
                                         [Modified Model File]
                                                        |
                                                        v
                                         (Real Simulator Process Exec)
                                                        |
                                                        v
                                         [Raw Output Files (.tdr, .vtu)]
                                                        |
                                                        v
                                         (Result Parser)
                                                        |
                                                        v
                                         [Parsed Metrics DataFrame]
                                                        |
                                                        v
                                         (AI Scientific Reasoner)
                                          /                    \
                               (Goal Not Met)               (Goal Met)
                                     /                            \
                  [Optimization Loop: Propose X_k+1]      [Generate Final Report]
```

---

## 7. Module Dependency Graph

```
+---------------------------------------------------------------------------------+
|                                    App.tsx                                      |
+----------------------------------------+----------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                                  AI Core Module                                 |
|  (ResearchPlanner, ScientificReasoner, OptimizationEngine, ReportGenerator)     |
+----------------------------------------+----------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            Simulation Orchestrator                              |
|           (WorkspaceManager, ProcessRunner, ArtifactCollector)                  |
+----------------------------------------+----------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                                 Plugin SDK Core                                 |
|   (COMSOLPlugin, SentaurusPlugin, QuantumATKPlugin, LumericalPlugin, etc.)       |
+----------------------------------------+----------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                               External Software                                 |
|   (Native binaries: comsol, sde, sdevice, atkpython, openfoam, matlab)          |
+---------------------------------------------------------------------------------+
```

---

## 8. Execution Sequence Diagram

```
User           AI Core        Orchestrator       Plugin SDK       Simulator Exec
  |               |                 |                 |                 |
  |--- Create --->|                 |                 |                 |
  |    Research   |                 |                 |                 |
  |    Goal       |                 |                 |                 |
  |               |--- Load Model ->|                 |                 |
  |               |    Metadata     |--- Inspect ---->|                 |
  |               |                 |<-- Return Meta -|                 |
  |               |                 |                 |                 |
  |               |-- Propose Params|                 |                 |
  |               |   & Launch ---->|                 |                 |
  |               |                 |-- Modify File ->|                 |
  |               |                 |-- Run (Async) ->|                 |
  |               |                 |                 |-- Spawn Proc -->|
  |               |                 |                 |<-- Stream Logs -| (Running)
  |               |                 |<-- Status Update|                 |
  |               |                 |<-- Exit Code 0 -|<-- Complete ----|
  |               |                 |                 |                 |
  |               |                 |-- Collect Output|                 |
  |               |                 |-- Parse Results>|                 |
  |               |                 |<-- Parsed Data -|                 |
  |               |<-- Evaluated ---|                 |                 |
  |               |    Metrics      |                 |                 |
  |               |                 |                 |                 |
  |               | [Loop until     |                 |                 |
  |               |  Convergence]   |                 |                 |
  |<-- Final Report ---------------|                 |                 |
```

---

## 9. State Machine

```
  +--------------+
  |     IDLE     |
  +-------+------+
          |
          | User Submits Goal
          v
  +--------------+
  |  PLANNING    | <----------------------------------+
  +-------+------+                                    |
          |                                           |
          | Parameters Proposed                       | Goal Not Reached
          v                                           | (Next Iteration)
  +--------------+                                    |
  | PREPARING_RUN|                                    |
  +-------+------+                                    |
          |                                           |
          | Model Injected                            |
          v                                           |
  +--------------+      Simulation Failure            |
  |  EXECUTING   | -----------------------------+     |
  +-------+------+                              |     |
          |                                     |     |
          | Completed Exit Code 0               v     |
          v                             +-------------+--+
  +--------------+                      | ERROR_HANDLING |
  |   PARSING    |                      +----------------+
  +-------+------+                              |
          |                                     | Auto-Recovery / Refine Mesh
          | Metrics Extracted                   v
          v                             +----------------+
  +--------------+                      |   EVALUATING   |
  |  EVALUATING  | ---------------------+----------------+
  +-------+------+
          |
          | Goal Converged
          v
  +--------------+
  |  COMPLETED   |
  +--------------+
```

---

## 10. Database Architecture

* **Projects Table**: `id`, `name`, `scientific_field`, `simulator_id`, `description`, `created_at`
* **Models Table**: `id`, `project_id`, `file_name`, `file_path`, `file_format`, `parameters_schema_json`, `is_default`
* **Experiments Table**: `id`, `project_id`, `model_id`, `goal_description`, `status`, `target_metrics_json`
* **Simulation Runs Table**: `id`, `experiment_id`, `iteration`, `input_parameters_json`, `execution_time_sec`, `stdout_log`, `stderr_log`, `exit_code`, `status`
* **Run Metrics Table**: `id`, `run_id`, `metric_name`, `metric_value`, `unit`, `is_objective`
* **Artifacts Table**: `id`, `run_id`, `artifact_type` (mesh/plot/raw/report), `file_path`, `size_bytes`

---

## 11. Workspace Architecture

All runs occur in isolated filesystem workspaces:

```
/var/arp/workspaces/
├── project_019a/
│   ├── models/
│   │   ├── nanosheet_3nm.cmd
│   │   └── nanosheet_3nm.par
│   └── runs/
│       ├── run_iter_001/
│       │   ├── input_modified.cmd
│       │   ├── stdout.log
│       │   ├── stderr.log
│       │   ├── output_des.tdr
│       │   └── parsed_metrics.json
│       └── run_iter_002/
│           └── ...
```

---

## 12. Plugin Architecture

Plugins are registered in a global Plugin Registry (`PluginRegistry.ts`):

* **COMSOL Multiphysics Plugin** (`comsol_mph`)
* **Synopsys Sentaurus TCAD Plugin** (`sentaurus_tcad`)
* **QuantumATK Plugin** (`quantumatk_py`)
* **Ansys Lumerical Plugin** (`lumerical_fsp`)
* **Silvaco Atlas Plugin** (`silvaco_atlas`)
* **MATLAB / Simulink Plugin** (`matlab_m`)
* **OpenFOAM CFD Plugin** (`openfoam_foam`)

---

## 13. Result Parser Architecture

The Result Parser converts heterogeneous simulator outputs into standardized scientific data frames:

* **Text/Regex Parsers**: Extract scalar outputs from standard text output logs (`.out`, `.log`, `.dat`).
* **Binary File Readers**: Invoke CLI converters (e.g., `tdr2vtu` for Sentaurus, `mphread` for COMSOL) to extract 2D/3D mesh field tensors.
* **CSV/JSON Exporters**: Flatten all iteration curves ($I_d-V_g$, $C-V$, stress distributions, spectrum response) into JSON for UI plotting and AI evaluation.

---

## 14. AI Optimization Loop

```python
# Conceptual Optimization Pseudocode
def run_scientific_optimization_loop(experiment):
    model = load_model(experiment.model_id)
    optimizer = BayesianOptimizer(bounds=model.parameter_bounds)
    
    for iteration in range(experiment.max_iterations):
        params = optimizer.propose_next_parameters()
        
        # Launch REAL simulator
        run_result = orchestrator.execute_simulation(
            plugin=experiment.simulator_plugin,
            model=model,
            parameters=params
        )
        
        if run_result.failed:
            optimizer.register_failure(params, reason=run_result.stderr)
            continue
            
        metrics = parser.extract_metrics(run_result.artifact_paths)
        objective_score = evaluate_scientific_goal(experiment.goal, metrics)
        
        optimizer.update(params, objective_score)
        
        if objective_score.has_converged():
            break
            
    return generate_final_report(experiment, optimizer.history)
```

---

## 15. Report Generation Pipeline

1. **Telemetry & History Collection**: Aggregates all parameter iterations, scalar outputs, and log outputs.
2. **Graphic Rendering**: Converts curves ($I-V$, Pareto fronts, temperature fields) into SVG/PNG artifacts.
3. **Markdown / LaTeX Template Synthesis**: Generates structured scientific text containing:
   - Problem statement & physics equations.
   - Selected simulation software & version parameters.
   - Convergence progression table.
   - Optimal parameter configuration set.
   - Publication-quality figures & citations.
4. **Export Engine**: Renders final downloadable PDF and HTML artifacts.

---

## 16. Security Model

* **Sandboxing**: External simulator executables run with unprivileged system user rights (`arp-runner`).
* **Path Traversal Guard**: All input model paths and file reads are sanitized to prevent directory escaping.
* **Resource Limits**: Hard memory (cgroups / RAM limits), CPU count bounds, and wall-clock time limit enforcement.

---

## 17. Scalability Strategy

* **Distributed Task Queue**: Built on Redis + Celery / BullMQ worker architecture.
* **Parallel Parameter Sweeps**: Multi-node concurrent parameter runs across independent simulator worker instances.
* **State Decoupling**: Stateless API servers with centralized database and shared NFS / S3 object storage for heavy simulation files.

---

## 18. HPC Support

* **Slurm / PBS Integration**: Job submission via `sbatch` or `qsub` templates for high-performance clusters.
* **MPI & OpenMP Support**: Multi-node and multi-core flag injection (`mpirun -np 64 sdevice`).

---

## 19. Local Workstation Support

* **Direct Binary Execution**: Fallback to local process execution (`child_process.spawn`) when running directly on a workstation with installed tools (`comsol.exe`, `sdevice`, `matlab`).

---

## 20. Future Cloud Execution Support

* **Containerized Simulators**: Execution inside Docker/Kubernetes containers hosting open-source or cloud-licensed solvers (e.g., OpenFOAM, Quantum ESPRESSO, Python/QuantumATK).
* **Cloud API Adapters**: Connectors to cloud simulation endpoints (Rescale, AWS ParallelCluster, Ansys Cloud).

---

*End of Architecture Blueprint V2.0 — Approved for Platform Alignment.*

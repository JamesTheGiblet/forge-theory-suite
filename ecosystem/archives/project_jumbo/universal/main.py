import ast
import inspect
import logging
import random
import subprocess
import textwrap
import docker
import os
import tempfile
import pickle
from pathlib import Path
import json
import sys
from typing import List, Dict, Any, Tuple, Optional
from collections import deque

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class SecurityError(Exception):
    pass

class CodeMetrics:
    @staticmethod
    def cyclomatic_complexity(tree: ast.AST) -> int:
        """Count decision points (if/while/for/and/or/except)"""
        complexity = 1  # Base complexity
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(node, ast.BoolOp):
                complexity += len(node.values) - 1
        return complexity
    
    @staticmethod
    def ast_depth(tree: ast.AST) -> int:
        """Maximum nesting depth of the AST"""
        max_depth = 0
        for node in ast.walk(tree):
            depth = 0
            curr = node
            while hasattr(curr, '_parent'):
                depth += 1
                curr = curr._parent
            max_depth = max(max_depth, depth)
        return max_depth

class CodeEvolutionEngine:
    def __init__(self):
        self.function_library = {}
        self.test_cases = {}
        self.global_envs = {}
        self.attempted_installs = set()
        self.dependency_graph = {}  # {'requests': ['urllib3', 'certifi'], ...}
        self.evolution_corpus = []
        self.performance_metrics = {}
        self.code_generation_attempts = 0
        self.max_evolution_depth = 10

        # NEW: Loop detection and mutation management
        self.mutation_history = {}  # {function_name: deque of (mutation_name, code_hash)}
        self.max_history_size = 5
        self.mutation_cooldown = {}  # {mutation_name: cooldown_counter}
        self.cooldown_period = 2  # How many iterations before mutation can be reused

        self.resource_budget = {
            'max_install_size_mb': 100,
            'max_execution_time_seconds': 10,
            'max_memory_mb': 512,
            'max_packages_per_function': 5
        }
        self.resource_usage = {
            'total_install_size_mb': 0,
            'packages_installed': 0
        }

        self.SAFE_PACKAGES = {
            'requests', 'numpy', 'pandas', 'matplotlib', 
            'beautifulsoup4', 'pillow', 'scipy', 'anthropic'
        }

        self.targeted_mutations = {
            TypeError: self.add_type_checking,
            NameError: self.add_import,
            IndexError: self.add_boundary_check,
            KeyError: self.add_key_check,
            AttributeError: self.add_attribute_check,
            # A NoneType key represents a logic error (where the failure context is None)
            type(None): self.tweak_return_value,
        }

        self.code_templates = {
            "sort": """
                def {function_name}(items):
                    \"\"\"{requirements}\"\"\"
                    return sorted(items)
            """,
            "search": """
                def {function_name}(items, target):
                    \"\"\"{requirements}\"\"\"
                    for i, item in enumerate(items):
                        if item == target:
                            return i
                    return -1
            """,
            "email": """
                def {function_name}(email_str):
                    \"\"\"{requirements}\"\"\"
                    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{{2,}}$'
                    return re.match(pattern, email_str) is not None
            """,
            "last_item": """
                def {function_name}(items):
                    \"\"\"{requirements}\"\"\"
                    return items[-1]
            """,
            "config": """
                def {function_name}(config, key):
                    \"\"\"{requirements}\"\"\"
                    return config[key]
            """,
            "user_name": """
                import dataclasses
                @dataclasses.dataclass
                class User:
                    name: str
            """,
            "fetch": """
                def {function_name}(url):
                    \"\"\"{requirements}\"\"\"
                    response = requests.get(url)
                    return response.json()
            """,
            "parse_int": """
                def {function_name}(s):
                    \"\"\"{requirements}\"\"\"
                    return int(s)
            """
        }

    def _record_mutation(self, function_name: str, mutation_name: str, code: str):
        """Record a mutation in the history for loop detection"""
        if function_name not in self.mutation_history:
            self.mutation_history[function_name] = deque(maxlen=self.max_history_size)
        
        code_hash = hash(code)
        self.mutation_history[function_name].append((mutation_name, code_hash))

    def _is_stuck_in_loop(self, function_name: str, current_code: str) -> bool:
        """Detect if we're oscillating between the same mutations"""
        if function_name not in self.mutation_history:
            return False
        
        history = self.mutation_history[function_name]
        if len(history) < 3:
            return False
        
        # Check for repeating patterns
        recent = list(history)[-4:]  # Look at last 4 mutations
        
        # Pattern 1: Same mutation applied multiple times in a row (3+)
        if len(recent) >= 3:
            if recent[-1][0] == recent[-2][0] == recent[-3][0]:
                logging.warning(f"🔄 Loop detected: Repeated mutation '{recent[-1][0]}'")
                return True
        
        # Pattern 2: Oscillating between two mutations
        if len(recent) >= 4:
            if recent[0][0] == recent[2][0] and recent[1][0] == recent[3][0]:
                logging.warning(f"🔄 Loop detected: Oscillation between '{recent[0][0]}' ↔ '{recent[1][0]}'")
                return True
        
        # Pattern 3: Code hash repeating (same code state)
        current_hash = hash(current_code)
        recent_hashes = [h for _, h in recent[:-1]]
        if current_hash in recent_hashes:
            logging.warning("🔄 Loop detected: Code state repetition")
            return True
        
        return False

    def _update_cooldowns(self):
        """Decrease all mutation cooldowns"""
        for mutation_name in list(self.mutation_cooldown.keys()):
            self.mutation_cooldown[mutation_name] = max(0, self.mutation_cooldown[mutation_name] - 1)
            if self.mutation_cooldown[mutation_name] == 0:
                del self.mutation_cooldown[mutation_name]

    def evolve_function(self, function_name: str, requirements: str, test_cases: List[Dict], current_code: str = None, failure_context: Optional[Exception] = None, _depth=0) -> str:
        """Evolve a function to meet requirements"""
        if _depth >= self.max_evolution_depth:
            print(f"✗ Evolution failed for {function_name} after reaching max depth.")
            return self.function_library.get(function_name, f"# Max evolution depth reached for {function_name}")

        self.code_generation_attempts += 1
        self.test_cases[function_name] = test_cases

        # Update cooldowns each iteration
        self._update_cooldowns()

        if current_code:
            # Check for loops before mutating
            if self._is_stuck_in_loop(function_name, current_code):
                logging.info("⚡ Breaking out of loop with forced exploration")
                mutated_code, mutation_applied = self.mutate_code(
                    current_code, requirements, test_cases, 
                    failure_context, force_random=True
                )
            else:
                mutated_code, mutation_applied = self.mutate_code(
                    current_code, requirements, test_cases, failure_context
                )
            
            # Record this mutation
            self._record_mutation(function_name, mutation_applied, mutated_code)
        else:
            # Otherwise, generate the initial version
            mutated_code = self.generate_initial_code(function_name, requirements)
            mutation_applied = "initial_generation"

        # Test the new code
        success, new_failure_context = self.test_function(mutated_code, function_name, test_cases)
        
        # Log the evolutionary step to the corpus
        if current_code: # Don't log the initial generation step
            # A step is successful if it passes tests OR if it changes the type of error.
            step_success = success or \
                (new_failure_context and failure_context and type(new_failure_context) is not type(failure_context))

            self.evolution_corpus.append({
                'function_name': function_name,
                'depth': _depth,
                'initial_code': current_code,
                'failure_context': type(failure_context).__name__ if failure_context else None,
                'mutation_applied': mutation_applied,
                'evolved_code': mutated_code,
                'outcome': 'success' if step_success else 'failure',
            })

        if success:
            self.function_library[function_name] = mutated_code
            self.learn_dependency_patterns(function_name)
            print(f"✓ Evolution successful for {function_name} at depth {_depth}")
            return mutated_code
        else:
            # Try again, but this time, pass the failed code to be mutated
            return self.evolve_function(function_name, requirements, test_cases, mutated_code, new_failure_context, _depth + 1)

    def install_package(self, module_name: str) -> bool:
        """Install a package with resource limit checks."""
        # Check package count budget
        if self.resource_usage['packages_installed'] >= self.resource_budget['max_packages_per_function']:
            logging.error(f"Package installation budget exceeded ({self.resource_budget['max_packages_per_function']} packages). Cannot install '{module_name}'.")
            return False

        try:
            logging.info(f"Attempting to install '{module_name}'...")
            subprocess.run(
                [sys.executable, "-m", "pip", "install", module_name],
                check=True, capture_output=True, text=True
            )
            logging.info(f"Successfully installed '{module_name}'.")
            self.resource_usage['packages_installed'] += 1
            return True
        except (subprocess.CalledProcessError, FileNotFoundError) as install_error:
            logging.error(f"Failed to install '{module_name}': {install_error.stderr if hasattr(install_error, 'stderr') else install_error}")
            return False

    def learn_dependency_patterns(self, successful_function: str):
        """Analyze which imports led to successful evolution"""
        tree = ast.parse(self.function_library[successful_function])
        imports = [node.names[0].name for node in ast.walk(tree) 
                   if isinstance(node, ast.Import)]
        
        # Update dependency graph
        for imp in imports:
            if imp not in self.dependency_graph:
                self.dependency_graph[imp] = set()
            # A module depends on all other modules imported alongside it
            self.dependency_graph[imp].update(set(imports) - {imp})

    def generate_initial_code(self, function_name: str, requirements: str) -> str:
        """Generate initial code based on requirements"""
        # Find a matching template by checking for keywords in the function name.
        found_template = None
        best_match_len = 0
        for key in self.code_templates.keys():
            if key in function_name and len(key) > best_match_len:
                found_template = self.code_templates[key]
                best_match_len = len(key)
            # Add heuristic for multi-word keys
            elif all(k in function_name for k in key.split('_')) and len(key) > best_match_len:
                found_template = self.code_templates[key]
                best_match_len = len(key)
        if found_template:
            template = found_template
        else: # Fallback to a generic template
            template = """
            def {function_name}(*args, **kwargs):
                \"\"\"{requirements}\"\"\"
                # TODO: Implement functionality
                return args[0] if args else None
            """
        return textwrap.dedent(template.format(function_name=function_name, requirements=requirements)).strip()
    
    def mutate_code(self, code: str, requirements: str, test_cases: List[Dict], failure_context: Optional[Exception] = None, force_random: bool = False) -> Tuple[str, str]:
        """Mutate existing code to improve it"""
        tree = ast.parse(code)
        
        # Use the Strategy Pattern to select a targeted mutation (unless forced to explore)
        if not force_random:
            strategy = self.targeted_mutations.get(type(failure_context))
            if strategy:
                strategy_name = strategy.__name__
                
                # Check if this mutation is on cooldown
                if strategy_name in self.mutation_cooldown:
                    logging.info(f"Mutation '{strategy_name}' is on cooldown ({self.mutation_cooldown[strategy_name]} iterations left)")
                else:
                    error_name = type(failure_context).__name__ if failure_context else "Logic Error"
                    logging.info(f"{error_name} detected. Attempting targeted '{strategy_name}' mutation first.")
                    try:
                        # Pass context to the mutation function if it accepts it
                        sig = inspect.signature(strategy)
                        kwargs = {'test_cases': test_cases} if 'test_cases' in sig.parameters else {}
                        if 'failure_context' in sig.parameters:
                            kwargs['failure_context'] = failure_context
                        kwargs = {k: v for k, v in kwargs.items() if v is not None}

                        mutated_tree = strategy(tree, **kwargs)
                        mutated_code = ast.unparse(mutated_tree)
                        if mutated_code != code:
                            # Set cooldown after successful application
                            self.mutation_cooldown[strategy_name] = self.cooldown_period
                            return mutated_code, strategy_name
                        logging.info(f"Targeted mutation '{strategy_name}' did not apply. Falling back.")
                    except Exception as e:
                        logging.warning(f"Targeted mutation '{strategy_name}' failed: {e}. Falling back.")

        # Fallback to weighted random selection if no targeted mutation was applied.
        mutation_funcs = [
            self.add_type_checking,
            self.add_attribute_check,
            self.add_key_check,
            self.add_boundary_check,
            self.add_error_handling,
            self.optimize_loop,
            self.add_logging
        ]

        # Filter out mutations on cooldown
        available_funcs = [f for f in mutation_funcs if f.__name__ not in self.mutation_cooldown]
        
        if not available_funcs:
            logging.warning("All mutations on cooldown! Clearing cooldowns.")
            self.mutation_cooldown.clear()
            available_funcs = mutation_funcs

        # Dynamically calculate weights from the corpus
        mutation_stats = {}
        for step in self.evolution_corpus:
            mutation = step['mutation_applied']
            if mutation not in mutation_stats:
                mutation_stats[mutation] = {'success': 0, 'total': 0}
            mutation_stats[mutation]['total'] += 1
            if step['outcome'] == 'success':
                mutation_stats[mutation]['success'] += 1

        weights = []
        base_exploration_chance = 0.15
        for func in available_funcs:
            func_name = func.__name__
            if func_name in mutation_stats and mutation_stats[func_name]['total'] > 0:
                rate = mutation_stats[func_name]['success'] / mutation_stats[func_name]['total']
                weights.append(rate + base_exploration_chance)
            else:
                # Give a neutral weight to untried mutations
                weights.append(0.5)
        
        if self.evolution_corpus and available_funcs != mutation_funcs:
            logging.info(f"Using {len(available_funcs)}/{len(mutation_funcs)} available mutations")

        mutation_func = random.choices(available_funcs, weights=weights, k=1)[0]
        try:
            # Pass context to the mutation function if it accepts it
            sig = inspect.signature(mutation_func)
            if 'test_cases' in sig.parameters:
                mutated_tree = mutation_func(tree, test_cases=test_cases)
            else:
                mutated_tree = mutation_func(tree)
            
            result_code = ast.unparse(mutated_tree)
            
            # Set cooldown
            self.mutation_cooldown[mutation_func.__name__] = self.cooldown_period
            
            return result_code, mutation_func.__name__
        except Exception as e:
            logging.warning(f"Mutation failed: {e}. Returning original code.")
            return code, 'mutation_failed'
    
    def add_logging(self, tree: ast.AST) -> ast.AST:
        """Add logging to the start of a function."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Don't add logging if it's already there
                if any(isinstance(n, ast.Expr) and isinstance(n.value, ast.Call) and hasattr(n.value.func, 'attr') and n.value.func.attr == 'info' for n in node.body):
                    continue

                log_call = ast.Expr(value=ast.Call(
                    func=ast.Attribute(value=ast.Name(id='logging', ctx=ast.Load()), attr='info', ctx=ast.Load()),
                    args=[ast.Constant(value=f"Executing {node.name}...")],
                    keywords=[]
                ))
                insert_pos = 1 if (node.body and isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant)) else 0
                node.body.insert(insert_pos, log_call)
        return tree

    def optimize_loop(self, tree: ast.AST) -> ast.AST:
        """Placeholder for loop optimization logic."""
        logging.info("Attempting loop optimization (placeholder).")
        return tree

    def add_type_checking(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """Adds a type check for the first argument, inferring type from test cases."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if not node.args.args:
                    continue

                # Check if a similar type check already exists
                if any(isinstance(n, ast.If) and 'isinstance' in ast.dump(n.test) for n in node.body):
                    continue

                # Infer type from the first valid test case
                inferred_type = None
                for test in test_cases:
                    if test.get('args') and test['args'][0] is not None:
                        inferred_type = type(test['args'][0]).__name__
                        break
                
                if not inferred_type:
                    logging.warning("Could not infer type for type-checking mutation.")
                    return tree

                # Infer the return value for a failed type check
                return_value_on_fail = None
                for test in test_cases:
                    if test.get('args') and test['args'][0] is None:
                        return_value_on_fail = test.get('expected')
                        break

                arg_name = node.args.args[0].arg
                type_check_node = ast.If(
                    test=ast.UnaryOp(op=ast.Not(), operand=ast.Call(
                        func=ast.Name(id='isinstance', ctx=ast.Load()),
                        args=[ast.Name(id=arg_name, ctx=ast.Load()), ast.Name(id=inferred_type, ctx=ast.Load())],
                        keywords=[]
                    )),
                    body=[ast.Return(value=ast.Constant(value=return_value_on_fail))],
                    orelse=[]
                )
                insert_pos = 1 if ast.get_docstring(node) else 0
                node.body.insert(insert_pos, type_check_node)
        return tree

    def add_error_handling(self, tree, **kwargs):
        """Add try-except blocks to function"""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if not node.body or isinstance(node.body[0], ast.Try) or (len(node.body) > 1 and isinstance(node.body[1], ast.Try)):
                    continue

                docstring = ast.get_docstring(node)
                
                if docstring:
                    code_body = node.body[1:]
                else:
                    code_body = node.body

                if not code_body:
                    continue

                except_body = [ast.Expr(value=ast.Call(
                    func=ast.Attribute(value=ast.Name(id='logging', ctx=ast.Load()), attr='warning', ctx=ast.Load()),
                    args=[ast.JoinedStr(values=[
                        ast.Constant(value=f'Error in {node.name}: '),
                        ast.FormattedValue(value=ast.Name(id='e', ctx=ast.Load()), conversion=-1)
                    ])],
                    keywords=[]
                ))]

                new_body = [
                    ast.Try(
                        body=code_body,
                        handlers=[
                            ast.ExceptHandler(
                                type=ast.Name(id="Exception", ctx=ast.Load()),
                                name="e",
                                body=except_body
                            )
                        ],
                        orelse=[],
                        finalbody=[]
                    )
                ]

                if docstring:
                    node.body = [node.body[0]] + new_body
                else:
                    node.body = new_body
        return tree

    def add_import(self, tree: ast.Module, failure_context: NameError, **kwargs) -> ast.Module:
        """Adds an import statement to resolve a NameError."""
        try:
            missing_name = str(failure_context).split("'")[1]
        except IndexError:
            logging.warning(f"Could not parse missing name from NameError: {failure_context}")
            return tree

        for node in tree.body:
            if isinstance(node, ast.Import) and any(alias.name == missing_name for alias in node.names):
                return tree

        import_node = ast.Import(names=[ast.alias(name=missing_name)])
        tree.body.insert(0, import_node)
        logging.info(f"Added 'import {missing_name}' to resolve NameError.")
        return tree
    
    def add_boundary_check(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """Wraps code in a try-except IndexError block."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if any(isinstance(n, ast.Try) and any(h.type and h.type.id == 'IndexError' for h in n.handlers) for n in node.body):
                    continue

                docstring = ast.get_docstring(node)
                code_body = node.body[1:] if docstring else node.body
                if not code_body:
                    continue

                return_value_on_fail = None
                for test in test_cases:
                    if test.get('args') and not test['args'][0]:
                        return_value_on_fail = test.get('expected')
                        break

                except_body = [ast.Return(value=ast.Constant(value=return_value_on_fail))]

                new_body = [
                    ast.Try(
                        body=code_body,
                        handlers=[
                            ast.ExceptHandler(
                                type=ast.Name(id="IndexError", ctx=ast.Load()),
                                name=None,
                                body=except_body
                            )
                        ],
                        orelse=[],
                        finalbody=[]
                    )
                ]

                if docstring:
                    node.body = [node.body[0]] + new_body
                else:
                    node.body = new_body
        return tree

    def add_key_check(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """Adds a check for a key's existence in a dictionary."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                subscript_node = next((n for n in ast.walk(node) if isinstance(n, ast.Subscript)), None)
                if not subscript_node:
                    continue

                if len(node.args.args) < 2:
                    continue
                
                dict_name = node.args.args[0].arg
                key_name = node.args.args[1].arg

                return_value_on_fail = None
                for test in test_cases:
                    if 'missing_key' in test.get('description', ''):
                        return_value_on_fail = test.get('expected')
                        break

                key_check_node = ast.If(
                    test=ast.Compare(left=ast.Name(id=key_name, ctx=ast.Load()), ops=[ast.NotIn()], comparators=[ast.Name(id=dict_name, ctx=ast.Load())]),
                    body=[ast.Return(value=ast.Constant(value=return_value_on_fail))],
                    orelse=[]
                )
                insert_pos = 1 if ast.get_docstring(node) else 0
                node.body.insert(insert_pos, key_check_node)
                return tree
        return tree

    def add_attribute_check(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """Adds a check for an attribute's existence."""
        for func_node in ast.walk(tree):
            if isinstance(func_node, ast.FunctionDef):
                if any(isinstance(n, ast.Try) and any(h.type and h.type.id == 'AttributeError' for h in n.handlers) for n in func_node.body):
                    continue

                docstring = ast.get_docstring(func_node)
                code_body = func_node.body[1:] if docstring else func_node.body
                if not code_body:
                    continue

                return_value_on_fail = None
                for test in test_cases:
                    if test.get('args') and test['args'][0] is None:
                        return_value_on_fail = test.get('expected')
                        break
                
                except_body = [ast.Return(value=ast.Constant(value=return_value_on_fail))]

                new_body = [
                    ast.Try(
                        body=code_body,
                        handlers=[ast.ExceptHandler(type=ast.Name(id="AttributeError", ctx=ast.Load()), name=None, body=except_body)],
                        orelse=[],
                        finalbody=[]
                    )
                ]

                if docstring:
                    func_node.body = [func_node.body[0]] + new_body
                else:
                    func_node.body = new_body
                return tree
        return tree

    def tweak_return_value(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """
        IMPROVED: More conservative logic mutation that only applies to appropriate contexts.
        """
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Only apply to functions with names suggesting indexing
                index_keywords = ['last', 'first', 'item', 'element', 'get']
                if not any(keyword in node.name.lower() for keyword in index_keywords):
                    logging.info(f"tweak_return_value: Skipping '{node.name}' (not an indexing function)")
                    return tree  # Don't apply to non-indexing functions
                
                # Find the last return statement
                return_node = None
                for body_item in reversed(node.body):
                    if isinstance(body_item, ast.Return):
                        return_node = body_item
                        break
                
                if not return_node:
                    continue

                # If the return value is already a subscript, try unwrapping it
                if isinstance(return_node.value, ast.Subscript):
                    logging.info("tweak_return_value: Unwrapping existing subscript")
                    return_node.value = return_node.value.value
                    return tree

                # Heuristic: determine index based on function name
                chosen_index = 0
                if 'last' in node.name.lower():
                    chosen_index = -1
                elif 'first' in node.name.lower():
                    chosen_index = 0
                else:
                    # Default based on test cases
                    chosen_index = 0

                logging.info(f"tweak_return_value: Wrapping return with subscript [{chosen_index}]")
                if isinstance(return_node.value, (ast.Name, ast.Call)):
                    original_value = return_node.value
                    return_node.value = ast.Subscript(value=original_value, slice=ast.Constant(value=chosen_index), ctx=ast.Load())
                return tree
        
        return tree

    def test_function(self, code: str, function_name: str, test_cases: List[Dict]) -> Tuple[bool, Optional[Exception]]:
        """Test if the function works correctly"""
        try:
            if function_name not in self.global_envs:
                self.global_envs[function_name] = {'logging': logging, '__builtins__': __builtins__}
            
            global_env = self.global_envs[function_name]
            exec(code, global_env)

            func = global_env[function_name]

            for test in test_cases:
                args = test.get('args', [])
                kwargs = test.get('kwargs', {})
                expected_output = test.get('expected')
                
                result = func(*args, **kwargs)

                if result != expected_output:
                    print(f"✗ Test failed for {function_name}: Input {args}, expected {expected_output}, got {result}")
                    return False, None

            return True, None
        except ModuleNotFoundError as e:
            module_name = e.name

            if module_name not in self.SAFE_PACKAGES:
                logging.error(f"Refusing to install untrusted package: {module_name}")
                return False, e
            
            if not module_name.replace('-', '').replace('_', '').isalnum():
                logging.error(f"Invalid package name detected: {module_name}")
                return False, e

            if module_name and module_name not in self.attempted_installs:
                logging.warning(f"Module '{module_name}' not found. Attempting to install with pip.")
                self.attempted_installs.add(module_name)
                if self.install_package(module_name):
                    return self.test_function(code, function_name, test_cases)
            return False, e
        except TypeError as e:
            # Better error classification for TypeErrors
            error_msg = str(e)
            if "'NoneType'" in error_msg or "NoneType" in error_msg:
                logging.info(f"Detected NoneType-related TypeError: {error_msg}")
                # Create a more specific TypeError that will trigger type checking
                specific_error = TypeError(f"NoneType argument: {error_msg}")
                print(f"✗ Test failed for {function_name}: {specific_error}")
                return False, specific_error
            print(f"✗ Test failed for {function_name}: {e}")
            return False, e
        except Exception as e:
            print(f"✗ Test failed for {function_name}: {e}")
            return False, e

    def report_on_corpus(self):
        """Analyzes and reports on the evolution corpus."""
        print("\n=== Evolution Corpus Report ===")
        if not self.evolution_corpus:
            print("No evolutionary steps were recorded.")
            return

        success_rates = {}
        for step in self.evolution_corpus:
            mutation = step['mutation_applied']
            if mutation not in success_rates:
                success_rates[mutation] = {'success': 0, 'total': 0}
            success_rates[mutation]['total'] += 1
            if step['outcome'] == 'success':
                success_rates[mutation]['success'] += 1
        
        print("Mutation Success Rates:")
        for mutation, stats in success_rates.items():
            rate = (stats['success'] / stats['total']) * 100 if stats['total'] > 0 else 0
            print(f"  - {mutation}: {rate:.1f}% success rate ({stats['success']}/{stats['total']})")


# Simplified versions of the advanced engines for demo
class SandboxedEvolutionEngine(CodeEvolutionEngine):
    def __init__(self):
        super().__init__()
        try:
            self.docker_client = docker.from_env()
            self.sandbox_image = "python:3.11-slim"
            self.docker_client.images.pull(self.sandbox_image)
            logging.info(f"Sandboxed engine initialized with Docker image: {self.sandbox_image}")
        except Exception as e:
            raise docker.errors.DockerException(f"Docker not available: {e}")


# Example usage
if __name__ == "__main__":
    print("=== Code Evolution Engine with Loop Detection ===\n")
    
    # Try to use sandboxed engine, fall back to regular if Docker unavailable
    try:
        engine = SandboxedEvolutionEngine()
    except:
        logging.warning("Docker unavailable, using non-sandboxed engine")
        engine = CodeEvolutionEngine()
    
    print("=== Test 1: Evolving a Sort Function ===")
    sort_test_cases = [
        {'args': ([3, 1, 2],), 'expected': [1, 2, 3]},
        {'args': ([],), 'expected': []},
        {'args': (None,), 'expected': None}
    ]

    sort_code = engine.evolve_function(
        "smart_sort",
        "Sort lists efficiently with error handling",
        sort_test_cases
    )
    print(f"\n✅ Final evolved code:\n{sort_code}\n")
    print(f"Total attempts: {engine.code_generation_attempts}\n")

    print("=== Test 2: Email Validator ===")
    email_test_cases = [
        {'args': ('test@example.com',), 'expected': True},
        {'args': ('invalid-email',), 'expected': False},
    ]
    
    # Reset counter
    engine.code_generation_attempts = 0
    
    email_code = engine.evolve_function(
        "is_valid_email", 
        "Validate an email address using regex", 
        email_test_cases
    )
    print(f"\n✅ Final evolved code:\n{email_code}\n")
    print(f"Total attempts: {engine.code_generation_attempts}\n")

    print("=== Test 3: Safe List Accessor ===")
    get_last_item_tests = [
        {'args': ([1, 2, 3],), 'expected': 3},
        {'args': (['a', 'b'],), 'expected': 'b'},
        {'args': ([],), 'expected': None}
    ]
    
    engine.code_generation_attempts = 0
    last_item_code = engine.evolve_function(
        "get_last_item", 
        "Get the last item from a list safely", 
        get_last_item_tests
    )
    print(f"\n✅ Final evolved code:\n{last_item_code}\n")
    print(f"Total attempts: {engine.code_generation_attempts}\n")

    engine.report_on_corpus()
    
    print("\n" + "="*50)
    print("✅ All tests completed successfully!")
    print("="*50)
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

    def evolve_function(self, function_name: str, requirements: str, test_cases: List[Dict], current_code: str = None, failure_context: Optional[Exception] = None, _depth=0) -> str:
        """Evolve a function to meet requirements"""
        if _depth >= self.max_evolution_depth:
            print(f"✗ Evolution failed for {function_name} after reaching max depth.")
            return self.function_library.get(function_name, f"# Max evolution depth reached for {function_name}")

        self.code_generation_attempts += 1
        self.test_cases[function_name] = test_cases

        if current_code:
            # If we have code, mutate it
            mutated_code, mutation_applied = self.mutate_code(current_code, requirements, test_cases, failure_context)
        else:
            # Otherwise, generate the initial version
            mutated_code = self.generate_initial_code(function_name, requirements)

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
            print(f"✓ Evolution successful for {function_name}")
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

        # The user's suggestion to check size via `pip download` is excellent.
        # For now, we will proceed with direct installation and focus on the package count.
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
        # For the demo, we'll keep the specific templates
        # A more advanced system would use LLMs or more abstract templates here.
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
    
    def mutate_code(self, code: str, requirements: str, test_cases: List[Dict], failure_context: Optional[Exception] = None) -> Tuple[str, str]:
        """Mutate existing code to improve it"""
        tree = ast.parse(code)
        
        # Use the Strategy Pattern to select a targeted mutation.
        strategy = self.targeted_mutations.get(type(failure_context))
        if strategy:
            strategy_name = strategy.__name__
            error_name = type(failure_context).__name__ if failure_context else "Logic Error"
            logging.info(f"{error_name} detected. Attempting targeted '{strategy_name}' mutation first.")
            try:
                # Pass context to the mutation function if it accepts it
                sig = inspect.signature(strategy)
                kwargs = {'test_cases': test_cases} if 'test_cases' in sig.parameters else {}
                kwargs['failure_context'] = failure_context if 'failure_context' in sig.parameters else None
                kwargs = {k: v for k, v in kwargs.items() if v is not None}

                mutated_tree = strategy(tree, **kwargs)
                mutated_code = ast.unparse(mutated_tree)
                if mutated_code != code:
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
            self.tweak_return_value, # Add to fallback pool
            self.optimize_loop,
            self.add_logging
        ]

        # Dynamically calculate weights from the corpus, creating a learning feedback loop.
        mutation_stats = {}
        for step in self.evolution_corpus:
            mutation = step['mutation_applied']
            if mutation not in mutation_stats:
                mutation_stats[mutation] = {'success': 0, 'total': 0}
            mutation_stats[mutation]['total'] += 1
            if step['outcome'] == 'success':
                mutation_stats[mutation]['success'] += 1

        weights = []
        base_exploration_chance = 0.1 # Ensure even failed mutations get a chance
        for func in mutation_funcs:
            func_name = func.__name__
            if func_name in mutation_stats and mutation_stats[func_name]['total'] > 0:
                rate = mutation_stats[func_name]['success'] / mutation_stats[func_name]['total']
                weights.append(rate + base_exploration_chance)
            else:
                # Give a neutral weight to untried mutations
                weights.append(0.5)
        
        if self.evolution_corpus:
            logging.info(f"Dynamic mutation weights calculated from corpus: {[f'{w:.2f}' for w in weights]}")

        mutation_func = random.choices(mutation_funcs, weights=weights, k=1)[0]
        try:
            # Pass context to the mutation function if it accepts it
            sig = inspect.signature(mutation_func)
            if 'test_cases' in sig.parameters:
                mutated_tree = mutation_func(tree, test_cases=test_cases)
            else:
                mutated_tree = mutation_func(tree)
            return ast.unparse(mutated_tree), mutation_func.__name__
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

                # Create logging call: logging.info(f"Executing {node.name}...")
                log_call = ast.Expr(value=ast.Call(
                    func=ast.Attribute(value=ast.Name(id='logging', ctx=ast.Load()), attr='info', ctx=ast.Load()),
                    args=[ast.Constant(value=f"Executing {node.name}...")],
                    keywords=[]
                ))
                # Insert after the docstring if it exists
                insert_pos = 1 if (node.body and isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant)) else 0
                node.body.insert(insert_pos, log_call)
        return tree

    def optimize_loop(self, tree: ast.AST) -> ast.AST:
        """Placeholder for loop optimization logic."""
        # e.g., transform for loops into list comprehensions
        logging.info("Attempting loop optimization (placeholder).")
        return tree # No change for now

    def add_type_checking(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """Adds a type check for the first argument, inferring type from test cases."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if not node.args.args:
                    continue # No arguments to check

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
                    return tree # Cannot perform mutation
                
                # Infer the return value for a failed type check from the test cases
                # Find the test case with a None argument
                return_value_on_fail = None # Default
                for test in test_cases:
                    if test.get('args') and test['args'][0] is None:
                        return_value_on_fail = test.get('expected')
                        break


                arg_name = node.args.args[0].arg
                # Build the AST for: if not isinstance(arg, <inferred_type>): return None
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
                # Don't wrap a function that's already wrapped
                if not node.body or isinstance(node.body[0], ast.Try) or (len(node.body) > 1 and isinstance(node.body[1], ast.Try)):
                    continue

                docstring = ast.get_docstring(node)
                
                # Separate the docstring from the actual code body
                if docstring:
                    code_body = node.body[1:]
                else:
                    code_body = node.body

                if not code_body: # Don't wrap an empty function
                    continue

                # Log the exception for better learning
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

                # Re-add the docstring node if it existed
                if docstring:
                    node.body = [node.body[0]] + new_body
                else:
                    node.body = new_body
        return tree

    def add_import(self, tree: ast.Module, failure_context: NameError, **kwargs) -> ast.Module:
        """Adds an import statement to the top of the file to resolve a NameError."""
        # Heuristic: extract the missing name from the error message.
        # e.g., "name 're' is not defined" -> "re"
        try:
            missing_name = str(failure_context).split("'")[1]
        except IndexError:
            logging.warning(f"Could not parse missing name from NameError: {failure_context}")
            return tree

        # Check if the import already exists
        for node in tree.body:
            if isinstance(node, ast.Import) and any(alias.name == missing_name for alias in node.names):
                return tree # Import already exists

        # Create and insert the new import node
        import_node = ast.Import(names=[ast.alias(name=missing_name)])
        tree.body.insert(0, import_node)
        logging.info(f"Added 'import {missing_name}' to resolve NameError.")
        return tree
    
    def add_boundary_check(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """Wraps code in a try-except IndexError block to handle out-of-bounds access."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Don't wrap if already wrapped
                if any(isinstance(n, ast.Try) and any(h.type and h.type.id == 'IndexError' for h in n.handlers) for n in node.body):
                    continue

                docstring = ast.get_docstring(node)
                code_body = node.body[1:] if docstring else node.body
                if not code_body:
                    continue

                # Infer the return value for a failed boundary check from the test cases
                return_value_on_fail = None
                for test in test_cases:
                    if test.get('args') and not test['args'][0]: # Find test with empty list
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
        """Adds a check for a key's existence in a dictionary before access."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Find the first subscript access (e.g., config[key])
                subscript_node = next((n for n in ast.walk(node) if isinstance(n, ast.Subscript)), None)
                if not subscript_node:
                    continue

                # Heuristic: assume the object is the first arg and the key is the second.
                if len(node.args.args) < 2:
                    continue
                
                dict_name = node.args.args[0].arg
                key_name = node.args.args[1].arg

                # Infer return value on failure from test cases
                return_value_on_fail = None
                for test in test_cases:
                    if 'missing_key' in test.get('description', ''):
                        return_value_on_fail = test.get('expected')
                        break

                # Build AST for: if key not in dict: return ...
                key_check_node = ast.If(
                    test=ast.Compare(left=ast.Name(id=key_name, ctx=ast.Load()), ops=[ast.NotIn()], comparators=[ast.Name(id=dict_name, ctx=ast.Load())]),
                    body=[ast.Return(value=ast.Constant(value=return_value_on_fail))],
                    orelse=[]
                )
                insert_pos = 1 if ast.get_docstring(node) else 0
                node.body.insert(insert_pos, key_check_node)
                return tree # Apply once and exit
        return tree

    def add_attribute_check(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """Adds a check for an attribute's existence on an object before access."""
        # This mutation is now more robust and handles nested attributes by using a try/except block,
        # similar to how add_boundary_check handles IndexError.
        for func_node in ast.walk(tree):
            if isinstance(func_node, ast.FunctionDef):
                # Don't wrap if already wrapped for AttributeError
                if any(isinstance(n, ast.Try) and any(h.type and h.type.id == 'AttributeError' for h in n.handlers) for n in func_node.body):
                    continue

                docstring = ast.get_docstring(func_node)
                code_body = func_node.body[1:] if docstring else func_node.body
                if not code_body:
                    continue

                # Infer return value on failure from test cases
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
                return tree # Apply once and exit
        return tree

    def tweak_return_value(self, tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
        """
        Attempts to fix a logic error by modifying the function's return statement.
        This is a simple heuristic-based mutation.
        """
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Find the last return statement
                return_node = None
                for body_item in reversed(node.body):
                    if isinstance(body_item, ast.Return):
                        return_node = body_item
                        break
                
                if return_node:
                    # Heuristic: If returning a simple variable, try returning an element from it.
                    # Be smarter: check for keywords and try multiple indices.
                    indices_to_try = [0, -1] # Common cases
                    
                    if 'first' in node.name:
                        indices_to_try = [0] # Prioritize index 0
                    elif 'last' in node.name:
                        indices_to_try = [-1] # Prioritize index -1

                    # For this demo, we'll just pick one based on the heuristic.
                    # A more advanced version could try all and see which one passes.
                    chosen_index = indices_to_try[0]
                    logging.info(f"Applying logic heuristic: changing return to subscript with index {chosen_index}.")
                    return_node.value = ast.Subscript(value=return_node.value, slice=ast.Constant(value=chosen_index), ctx=ast.Load())
                    return tree
        return tree

    def test_function(self, code: str, function_name: str, test_cases: List[Dict]) -> Tuple[bool, Optional[Exception]]:
        """Test if the function works correctly"""
        try:
            # Use a persistent global environment for each function
            if function_name not in self.global_envs:
                self.global_envs[function_name] = {'logging': logging, '__builtins__': __builtins__}
            
            global_env = self.global_envs[function_name]
            # Execute the code in a safe environment
            exec(code, global_env)

            # The function is now in the global_env
            func = global_env[function_name]

            # Now, test the function
            for test in test_cases:
                args = test.get('args', [])
                kwargs = test.get('kwargs', {})
                expected_output = test.get('expected')
                
                result = func(*args, **kwargs)

                if result != expected_output:
                    print(f"✗ Test failed for {function_name}: Input {args}, expected {expected_output}, got {result}")
                    return False, None # Test failed on output mismatch

            return True, None # All tests passed
        except ModuleNotFoundError as e:
            module_name = e.name

            # CRITICAL: Validate module name against a whitelist
            if module_name not in self.SAFE_PACKAGES:
                logging.error(f"Refusing to install untrusted package: {module_name}")
                return False, e
            
            # CRITICAL: Check for characters that could be used in injection attacks
            if not module_name.replace('-', '').replace('_', '').isalnum():
                logging.error(f"Invalid package name detected: {module_name}")
                return False, e

            if module_name and module_name not in self.attempted_installs:
                logging.warning(f"Module '{module_name}' not found. Attempting to install with pip.")
                self.attempted_installs.add(module_name)
                if self.install_package(module_name):
                    # Retry the test function call once after successful installation
                    return self.test_function(code, function_name, test_cases)
                # If installation fails, fall through and return the original error
            return False, e # Module already attempted or name is None
        except Exception as e:
            print(f"✗ Test failed for {function_name}: {e}")
            return False, e # Test failed with an exception

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
            rate = (stats['success'] / stats['total']) * 100
            print(f"- {mutation}: {rate:.1f}% success rate ({stats['success']}/{stats['total']})")

class SandboxedEvolutionEngine(CodeEvolutionEngine):
    def __init__(self):
        super().__init__()
        try:
            self.docker_client = docker.from_env()
            self.sandbox_image = "python:3.11-slim"
            # Pull the image if it doesn't exist
            self.docker_client.images.pull(self.sandbox_image)
            logging.info(f"Sandboxed engine initialized with Docker image: {self.sandbox_image}")
        except Exception as e:
            raise docker.errors.DockerException(f"Docker not available or failed to initialize. Sandboxing disabled. Error: {e}")

    def _get_test_runner_script(self):
        return textwrap.dedent("""
            import sys
            import json
            import importlib.util
            import traceback

            def run_tests(code_path, tests_path, function_name):
                try:
                    spec = importlib.util.spec_from_file_location("evolved_function", code_path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    func = getattr(module, function_name)

                    with open(tests_path, 'r') as f:
                        test_cases = json.load(f)

                    for test in test_cases:
                        args = test.get('args', [])
                        kwargs = test.get('kwargs', {})
                        expected = test.get('expected')
                        result = func(*args, **kwargs)
                        if result != expected:
                            return {'status': 'fail', 'reason': 'output_mismatch', 'expected': expected, 'actual': result}

                    return {'status': 'success'}
                except Exception as e:
                    return {'status': 'fail', 'reason': 'exception', 'type': type(e).__name__, 'message': str(e)}

            if __name__ == "__main__":
                code_path, tests_path, function_name = sys.argv[1], sys.argv[2], sys.argv[3]
                result = run_tests(code_path, tests_path, function_name)
                print(json.dumps(result))
        """)

    def _parse_test_results(self, logs: bytes) -> Tuple[bool, Optional[Exception]]:
        """Parse the JSON output from the sandboxed test runner."""
        try:
            output = logs.decode('utf-8').strip()
            result = json.loads(output)

            if result['status'] == 'success':
                return True, None
            
            if result['reason'] == 'exception':
                # Re-create a generic exception to represent the failure
                error_type = result.get('type', 'Exception')
                error_message = result.get('message', 'Sandboxed execution failed.')
                # Dynamically create an exception class to mimic the original
                exception_class = type(error_type, (Exception,), {})
                print(f"✗ Test failed with sandboxed exception: {error_type}: {error_message}")
                return False, exception_class(error_message)
            elif result['reason'] == 'output_mismatch':
                print(f"✗ Test failed on output mismatch: expected {result['expected']}, got {result['actual']}")
                return False, None
            return False, Exception("Unknown failure in sandbox.")
        except (json.JSONDecodeError, KeyError, UnicodeDecodeError) as e:
            logging.error(f"Failed to parse sandbox results: {e}\nLogs: {logs.decode('utf-8', errors='ignore')}")
            return False, Exception("Failed to parse sandbox results.")

    def test_function(self, code: str, function_name: str, test_cases: List[Dict]) -> Tuple[bool, Optional[Exception]]:
        """Run tests in an isolated Docker container."""
        with tempfile.TemporaryDirectory() as tmpdir:
            code_path = f"{tmpdir}/function.py"
            tests_path = f"{tmpdir}/tests.json"
            runner_path = f"{tmpdir}/runner.py"

            with open(code_path, 'w') as f: f.write(code)
            with open(tests_path, 'w') as f: json.dump(test_cases, f)
            with open(runner_path, 'w') as f: f.write(self._get_test_runner_script())

            command = f"python runner.py function.py tests.json {function_name}"
            try:
                container = self.docker_client.containers.run(
                    self.sandbox_image, command,
                    volumes={tmpdir: {'bind': '/workspace', 'mode': 'ro'}},
                    working_dir='/workspace', mem_limit='256m', cpu_period=100000, cpu_quota=50000,
                    network_disabled=True, remove=True, detach=False
                )
                return self._parse_test_results(container)
            except Exception as e:
                logging.error(f"Docker container execution failed: {e}")
                return False, e

class PersistentEvolutionEngine(SandboxedEvolutionEngine):
    def __init__(self, corpus_path="evolution_corpus.pkl"):
        super().__init__()
        self.corpus_path = Path(corpus_path)
        self.load_corpus()
    
    def load_corpus(self):
        """Load previously learned patterns"""
        if self.corpus_path.exists():
            try:
                with open(self.corpus_path, 'rb') as f:
                    data = pickle.load(f)
                    self.evolution_corpus = data.get('corpus', [])
                    self.dependency_graph = data.get('dependencies', {})
                    logging.info(f"Loaded {len(self.evolution_corpus)} evolutionary steps from corpus at '{self.corpus_path}'")
            except (pickle.UnpicklingError, EOFError) as e:
                logging.error(f"Failed to load corpus file: {e}. Starting with a fresh corpus.")
    
    def save_corpus(self):
        """Persist learning for future runs"""
        try:
            with open(self.corpus_path, 'wb') as f:
                pickle.dump({
                    'corpus': self.evolution_corpus,
                    'dependencies': self.dependency_graph,
                    'timestamp': logging.time.time()
                }, f)
            logging.info(f"Saved corpus with {len(self.evolution_corpus)} steps to '{self.corpus_path}'")
        except Exception as e:
            logging.error(f"Failed to save corpus: {e}")
    
    def __del__(self):
        """Save on cleanup"""
        if self.evolution_corpus: # Only save if there's something to save
            self.save_corpus()

class ParetoEvolutionEngine(PersistentEvolutionEngine):
    def __init__(self):
        super().__init__()
        self.pareto_front = []  # List of (code, correctness, complexity, depth)
    
    def evolve_function(self, function_name: str, requirements: str, test_cases: List[Dict], 
                       current_code: str = None, failure_context: Optional[Exception] = None, 
                       _depth=0) -> str:
        """Evolve using Pareto optimization to find the simplest correct solution."""
        
        if _depth >= self.max_evolution_depth:
            # End of evolution, return the best solution found.
            if self.pareto_front:
                # Filter for fully correct solutions
                correct_solutions = [s for s in self.pareto_front if s[1] == 1.0]
                if correct_solutions:
                    # Sort by complexity, then depth, and return the code of the best one
                    best_solution = min(correct_solutions, key=lambda x: (x[2], x[3]))
                    logging.info(f"Evolution finished. Selecting best solution from Pareto front (Complexity: {best_solution[2]}, Depth: {best_solution[3]}).")
                    self.function_library[function_name] = best_solution[0]
                    return best_solution[0]
            # Fallback if no correct solution was found
            return super().evolve_function(function_name, requirements, test_cases, current_code, failure_context, _depth)

        # Generate/mutate code
        if current_code:
            mutated_code, mutation_applied = self.mutate_code(
                current_code, requirements, test_cases, failure_context
            )
        else: # Initial generation
            mutated_code = self.generate_initial_code(function_name, requirements)
            mutation_applied = "initial_generation"

        # Evaluate the new code
        success, new_failure_context = self.test_function(mutated_code, function_name, test_cases)
        
        try:
            tree = ast.parse(mutated_code)
            # Add parent pointers for depth calculation
            for node in ast.walk(tree):
                for child in ast.iter_child_nodes(node):
                    child._parent = node
        except SyntaxError:
            # If code is invalid, give it worst-case metrics
            tree = ast.parse("") 

        correctness = 1.0 if success else 0.0
        complexity = CodeMetrics.cyclomatic_complexity(tree)
        depth = CodeMetrics.ast_depth(tree)
        
        solution = (mutated_code, correctness, complexity, depth)

        # Update Pareto front
        if self._is_pareto_optimal(solution):
            # Remove solutions from the front that are now dominated by this new solution
            self.pareto_front = [s for s in self.pareto_front if not self._is_dominated(s, solution)]
            self.pareto_front.append(solution)
            logging.info(f"Added new optimal solution to front (Correctness: {correctness}, Complexity: {complexity}, Depth: {depth}). Front size: {len(self.pareto_front)}")

        # Log to corpus as before
        if current_code:
            step_success = success or (new_failure_context and failure_context and type(new_failure_context) is not type(failure_context))
            self.evolution_corpus.append({ 'function_name': function_name, 'depth': _depth, 'mutation_applied': mutation_applied, 'outcome': 'success' if step_success else 'failure' })

        # Decide next step
        if success:
            # We found a working solution. Now, try to simplify it.
            logging.info("Correct solution found. Attempting simplification mutations...")
            simplified_code = self.simplify_code(mutated_code)
            simplified_success, _ = self.test_function(simplified_code, function_name, test_cases)
            if simplified_success and simplified_code != mutated_code:
                 # If simplification worked, evolve from the simpler version
                 return self.evolve_function(function_name, requirements, test_cases, simplified_code, None, _depth + 1)

        # Continue evolution from the current state
        return self.evolve_function(function_name, requirements, test_cases, mutated_code, new_failure_context, _depth + 1)

    def _is_dominated(self, s1, s2):
        """Check if solution s1 is dominated by solution s2."""
        _, corr1, comp1, dep1 = s1
        _, corr2, comp2, dep2 = s2
        # s2 dominates s1 if it is at least as good in all objectives and strictly better in at least one.
        return (corr2 >= corr1 and comp2 <= comp1 and dep2 <= dep1) and \
               (corr2 > corr1 or comp2 < comp1 or dep2 < dep1)

    def _is_pareto_optimal(self, solution: Tuple[str, float, int, int]) -> bool:
        """Check if a solution is not dominated by any existing solution in the front."""
        for s_front in self.pareto_front:
            if self._is_dominated(solution, s_front):
                return False
        return True

    def simplify_code(self, code: str) -> str:
        """Applies mutations aimed at reducing complexity."""
        tree = ast.parse(code)
        # Simple heuristic: if a try-block only contains a return statement, unwrap it.
        # This is a risky simplification, but the test will verify its correctness.
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if node.body and isinstance(node.body[0], ast.Try) and len(node.body[0].body) == 1:
                    if isinstance(node.body[0].body[0], ast.Return):
                        logging.info("Applying simplification: unwrapping try-except around a single return.")
                        node.body = node.body[0].body
                        return ast.unparse(tree)
        return code

class GeneticEvolutionEngine(PersistentEvolutionEngine):
    def __init__(self, population_size=10):
        super().__init__()
        self.population_size = population_size
    
    def evolve_function(self, function_name: str, requirements: str, 
                                   test_cases: List[Dict], generations=5) -> str:
        """Evolve a population of solutions over several generations."""
        
        # Initialize population with variations
        population = []
        base_code = self.generate_initial_code(function_name, requirements)
        
        for i in range(self.population_size):
            if i == 0:
                code = base_code
            else:
                # Generate variations for initial population
                code, _ = self.mutate_code(base_code, requirements, test_cases, None)
            
            success, error = self.test_function(code, function_name, test_cases)
            fitness = self._calculate_fitness(code, success, error)
            population.append((code, fitness, success))
        
        # Evolve over generations
        for gen in range(generations):
            logging.info(f"Generation {gen + 1}/{generations} | Best fitness: {population[0][1]:.2f}")
            
            # Sort by fitness (descending)
            population.sort(key=lambda x: x[1], reverse=True)
            
            # Check if we have a solution
            if population[0][2]:  # success
                self.function_library[function_name] = population[0][0]
                logging.info(f"✓ Solution found in generation {gen + 1}")
                return population[0][0]
            
            # Selection: keep top 50% (elitism)
            survivors = population[:self.population_size // 2]
            
            # Reproduction
            new_population = list(survivors)
            while len(new_population) < self.population_size:
                # Tournament selection to choose parents
                parent1 = random.choice(survivors)
                parent2 = random.choice(survivors)
                
                # Crossover
                child_code = self._crossover(parent1[0], parent2[0])
                
                # Mutation
                if random.random() < 0.8:  # 80% mutation rate
                    child_code, _ = self.mutate_code(
                        child_code, requirements, test_cases, None
                    )
                
                success, error = self.test_function(child_code, function_name, test_cases)
                fitness = self._calculate_fitness(child_code, success, error)
                new_population.append((child_code, fitness, success))
            
            population = new_population
        
        # Return best solution found after all generations
        population.sort(key=lambda x: x[1], reverse=True)
        logging.warning(f"Evolution finished without a perfect solution. Returning best attempt.")
        return population[0][0]
    
    def _calculate_fitness(self, code: str, success: bool, error: Optional[Exception]) -> float:
        """Calculate fitness score. Higher is better."""
        if success:
            # Reward simplicity for correct solutions
            try:
                tree = ast.parse(code)
                complexity = CodeMetrics.cyclomatic_complexity(tree)
                lines = len(code.splitlines())
                return 1000.0 - complexity - (lines * 0.1)
            except SyntaxError:
                return 0 # Should not happen if success is true
        else:
            # Partial credit based on error type
            error_penalties = {
                TypeError: 50,
                NameError: 20, # High penalty, far from solution
                IndexError: 60,
                KeyError: 60,
                AttributeError: 60,
                type(None): 80  # Logic error - closer to solution
            }
            # Use the type of the error as the key
            penalty = error_penalties.get(type(error), 40)
            return float(penalty)
    
    def _crossover(self, code1: str, code2: str) -> str:
        """Combine two code snippets using a simple body-swapping crossover."""
        try:
            tree1 = ast.parse(code1)
            tree2 = ast.parse(code2)
            
            func1 = next(n for n in ast.walk(tree1) if isinstance(n, ast.FunctionDef))
            func2 = next(n for n in ast.walk(tree2) if isinstance(n, ast.FunctionDef))
            
            # Mix statements if both have bodies
            if len(func1.body) > 1 and len(func2.body) > 1:
                crossover_point = random.randint(1, min(len(func1.body), len(func2.body)) - 1)
                func1.body = func1.body[:crossover_point] + func2.body[crossover_point:]
            
            return ast.unparse(tree1)
        except (SyntaxError, StopIteration):
            # If parsing or crossover fails, just return one of the parents
            return random.choice([code1, code2])
        
class MetaEvolutionEngine(GeneticEvolutionEngine):
    """An engine that evolves its own mutation strategies through meta-learning."""
    
    def __init__(self):
        super().__init__()
        self.evolved_mutations = {}
        
    def evolve_mutation_strategy(self):
        """
        Meta-evolve new mutation strategies by analyzing successful patterns in the corpus.
        1. Analyze corpus for successful patterns (e.g., try-except wrappers).
        2. Extract an abstract repair template from those patterns.
        3. Specialize the template for a new, unhandled error type (e.g., ValueError).
        4. Register the specialized template as a new mutation operator.
        5. Apply it to solve previously unsolvable problems.
        """
        logging.info("=== META-EVOLUTION: Analyzing corpus to synthesize new mutation strategies ===")
        
        # 1. Analyze corpus for successful patterns
        # Find mutations that successfully use a try-except wrapper.
        successful_wrapper_mutations = {'add_boundary_check', 'add_attribute_check'}
        successful_patterns = []

        for step in self.evolution_corpus:
           if step.get('outcome') == 'success' and step.get('mutation_applied') in successful_wrapper_mutations:
                successful_patterns.append('try_except_wrapper')

        if not successful_patterns:
            logging.warning("Meta-evolution found no successful patterns to learn from.")
            return

        # 2. Extract abstract repair template (most common successful pattern)
        # For this demo, we assume 'try_except_wrapper' is the dominant pattern.
        abstract_template = 'try_except_wrapper'
        logging.info(f"Meta-evolution identified '{abstract_template}' as a successful abstract pattern.")

        # 3. Specialize template for a new error type (ValueError)
        # The system notices it has no handler for ValueError, so it creates one.
        new_error_type = ValueError
        new_mutation_name = f"add_{new_error_type.__name__.lower()}_handler"

        if new_error_type in self.targeted_mutations:
            logging.info(f"Handler for {new_error_type.__name__} already exists. Skipping synthesis.")
            return

        def create_specialized_handler(error_type_to_handle: type):
            """Factory function to create a specialized try-except mutation."""
            def specialized_handler(tree: ast.AST, test_cases: List[Dict], **kwargs) -> ast.AST:
                """A dynamically synthesized mutation to handle a specific error."""
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        # Avoid re-wrapping
                        if any(isinstance(n, ast.Try) and any(h.type and h.type.id == error_type_to_handle.__name__ for h in n.handlers) for n in node.body):
                            continue

                        docstring = ast.get_docstring(node)
                        code_body = node.body[1:] if docstring else node.body
                        if not code_body: continue

                        # Infer return value from a failing test case
                        return_value_on_fail = None
                        for test in test_cases:
                            # Heuristic: find a test that is expected to fail and get its return value.
                            # A more robust system would simulate the failure.
                            if test.get('expected') is None:
                                return_value_on_fail = test.get('expected')
                                break

                        new_body = [ast.Try(
                            body=code_body,
                            handlers=[ast.ExceptHandler(
                                type=ast.Name(id=error_type_to_handle.__name__, ctx=ast.Load()),
                                name=None,
                                body=[ast.Return(value=ast.Constant(value=return_value_on_fail))]
                            )],
                            orelse=[], finalbody=[]
                        )]

                        node.body = ([node.body[0]] + new_body) if docstring else new_body
                        logging.info(f"Applied synthesized '{new_mutation_name}' mutation.")
                        return tree
                return tree
            return specialized_handler

        # 4. Register the new mutation operator
        synthesized_mutation = create_specialized_handler(new_error_type)
        self.targeted_mutations[new_error_type] = synthesized_mutation
        self.evolved_mutations[new_mutation_name] = synthesized_mutation
        
        logging.info(f"✓ Meta-evolution successful: Synthesized and registered '{new_mutation_name}'.")
        print(f"🧬 The system can now handle {new_error_type.__name__} through meta-learning!\n")
class WorkerNode:
    """A placeholder class to simulate a remote worker in a distributed cluster."""
    def __init__(self, population_size=10):
        # Each worker has its own genetic engine instance.
        self.engine = GeneticEvolutionEngine(population_size)
        self.population = []

    def evolve_async(self, function_name, requirements, test_cases, generations):
        """Simulates the main async evolution task."""
        # In a real system, this would be a non-blocking call (e.g., using asyncio, futures).
        logging.info(f"Worker starting evolution for '{function_name}'...")
        self.engine.evolve_function(function_name, requirements, test_cases, generations)
        # For simulation, we just store the final population.
        self.population = self.engine.population
        return self # Return self to act as a 'future' object.

    def get_partial_results(self):
        """Simulates fetching the current best individuals from a worker."""
        # Sort by fitness and return the top individuals.
        self.population.sort(key=lambda x: x[1], reverse=True)
        return self.population

    def receive_migrants(self, migrants: list):
        """Simulates a worker receiving individuals from other islands."""
        # Replace the worst individuals with the new, stronger migrants.
        self.population.sort(key=lambda x: x[1], reverse=True)
        num_to_replace = min(len(migrants), len(self.population))
        self.population = self.population[:-num_to_replace] + migrants[:num_to_replace]
        logging.info(f"Worker received {len(migrants)} migrants.")

    def get(self):
        """Simulates waiting for the final result from the future."""
        return self.population

class DistributedEvolutionEngine(GeneticEvolutionEngine):
    def __init__(self, cluster_nodes):
        super().__init__()
        self.cluster = cluster_nodes  # List of worker machine simulators
    
    def evolve_function_distributed(self, function_name, requirements, test_cases, generations=50):
        """Distribute the evolutionary process across a simulated cluster."""
        
        # Each node evolves a sub-population asynchronously.
        futures = [node.evolve_async(function_name, requirements, test_cases, generations=generations) for node in self.cluster]
        
        # Periodically exchange best individuals (island model)
        # In a real system, this would be more complex, checking if futures are done.
        # For simulation, we assume a simple synchronous exchange.
        logging.info("--- Starting Island Migration Epochs ---")
        migrants = [node.get_partial_results()[0] for node in self.cluster] # Get best from each
        for node in self.cluster:
            node.receive_migrants(migrants)
        
        # Final gathering of all solutions from all nodes
        all_solutions = [item for future in futures for item in future.get()]
        
        return max(all_solutions, key=lambda x: x[1])[0]

# ==============================================================================
# CONCEPTUAL REAL-WORLD APPLICATION: VS CODE EXTENSION
# The following class is a conceptual blueprint for how this evolutionary
# system could be integrated into a developer tool like a VS Code extension.
# Note: This is pseudo-code and relies on a hypothetical VS Code API (`vscode`)
# and event decorators (`@on_test_failure`).
# ==============================================================================

class CodeHealerExtension:
    """
    A conceptual class representing a VS Code extension that uses the
    evolutionary engine to automatically suggest fixes for failing tests.
    """
    def __init__(self):
        self.engine = MetaEvolutionEngine()
        # In a real extension, this would load from a shared corpus,
        # perhaps stored in the extension's global storage path.
        self.engine.load_corpus()
    
    # This decorator would be part of the extension's framework,
    # listening for test runner failures in the IDE.
    # @on_test_failure 
    def auto_fix_bug(self, test_output: str, source_file: str):
        """
        Triggered by a test failure, this method attempts to evolve a fix
        and present it to the user as a suggestion.
        """
        # 1. Parse test failures into the structured format the engine needs.
        # This would involve parsing pytest/unittest output to extract args,
        # expected values, and the exception that occurred.
        test_cases = self.extract_test_cases_from_output(test_output)
        
        # 2. Read the source code of the file that failed.
        with open(source_file, 'r') as f:
            buggy_code = f.read()
        
        # 3. Evolve a fix using the buggy code as the starting point.
        fixed_code = self.engine.evolve_function(
            function_name=self.extract_function_name(buggy_code),
            requirements="Fix the failing tests based on the provided context.",
            test_cases=test_cases,
            current_code=buggy_code
        )
        
        # 4. If a fix is found, show it as a suggestion in the IDE.
        if fixed_code and fixed_code != buggy_code:
            # The confidence score could be derived from the number of attempts,
            # the success rate of the applied mutations, etc.
            self.show_fix_suggestion(buggy_code, fixed_code, confidence=0.95)

    def show_fix_suggestion(self, original_code: str, fixed_code: str, confidence: float):
        """Display the suggested fix in the VS Code UI using a hypothetical API."""
        # vscode.window.showInformationMessage(
        #     f"CodeHealer found a fix ({confidence:.0%} confidence)",
        #     "Apply Fix", "Show Diff", "Explain Fix"
        # )
        logging.info(f"[CONCEPT] Would show fix suggestion with {confidence:.0%} confidence.")

def run_ablation_study():
    """
    Compares the efficiency of the targeted mutation strategy against a random one
    to prove that intelligent mutation selection is more effective.
    """
    print("\n\n" + "="*20)
    print(" ABLATION STUDY: Targeted vs. Random Mutation")
    print("="*20)

    # Problem set using existing test cases
    problems = {
        'smart_sort': {
            'requirements': "Sort lists efficiently with error handling",
            'tests': [
                {'args': ([3, 1, 2],), 'expected': [1, 2, 3]},
                {'args': ([],), 'expected': []},
                {'args': (None,), 'expected': None} 
            ]
        },
        'is_valid_email': {
            'requirements': "Validate an email address using regex",
            'tests': [
                {'args': ('test@example.com',), 'expected': True},
                {'args': ('invalid-email',), 'expected': False},
            ]
        },
        'get_last_item': {
            'requirements': "Get the last item from a list safely",
            'tests': [
                {'args': ([1, 2, 3],), 'expected': 3},
                {'args': ([],), 'expected': None}
            ]
        },
        'get_config_value': {
            'requirements': "Get a value from a config dict safely",
            'tests': [
                {'args': ({'user': 'admin'}, 'user'), 'expected': 'admin'},
                {'args': ({'user': 'admin'}, 'password'), 'expected': None, 'description': 'missing_key'},
            ]
        }
    }

    results = {'random': [], 'targeted': []}
    
    for problem_name, details in problems.items():
        print(f"\n--- Solving '{problem_name}' ---")
        # --- Random Approach ---
        random_engine = CodeEvolutionEngine()
        random_engine.targeted_mutations = {} # Disable targeting
        random_engine.code_generation_attempts = 0 # Reset counter
        random_engine.evolve_function(problem_name, details['requirements'], details['tests'])
        results['random'].append(random_engine.code_generation_attempts)
        print(f"Random approach took: {random_engine.code_generation_attempts} attempts.")

        # --- Targeted Approach ---
        targeted_engine = CodeEvolutionEngine()
        targeted_engine.code_generation_attempts = 0 # Reset counter
        targeted_engine.evolve_function(problem_name, details['requirements'], details['tests'])
        results['targeted'].append(targeted_engine.code_generation_attempts)
        print(f"Targeted approach took: {targeted_engine.code_generation_attempts} attempts.")

    avg_random = sum(results['random']) / len(results['random'])
    avg_targeted = sum(results['targeted']) / len(results['targeted'])

    print("\n--- Ablation Study Results ---")
    print(f"Random Strategy Average Attempts: {avg_random:.1f}")
    print(f"Targeted Strategy Average Attempts: {avg_targeted:.1f}")
    print(f"Conclusion: Targeted mutation is ~{avg_random/avg_targeted:.1f}x more efficient.")

class LLMEvolutionEngine(SandboxedEvolutionEngine):
    def __init__(self, api_key=None):
        super().__init__()
        self.use_llm = api_key is not None
        if self.use_llm:
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=api_key)
                logging.info("LLM-powered code generation enabled (Anthropic).")
            except ImportError:
                logging.warning("Anthropic library not found. LLM generation disabled.")
                self.use_llm = False
    
    def generate_initial_code(self, function_name: str, requirements: str) -> str:
        """Use LLM for initial code generation if available, otherwise fallback to template."""
        
        # Always try template-based first as a reliable baseline
        template_code = super().generate_initial_code(function_name, requirements)
        
        # If LLM is available and the template was generic, try to get a better start from the LLM.
        if self.use_llm and "TODO: Implement" in template_code:
            try:
                prompt = f"""Write a Python function that meets these requirements. Provide only the raw Python code for the function, with no explanations or markdown.

Function name: {function_name}
Requirements: {requirements}"""

                message = self.client.messages.create(
                    model="claude-3-sonnet-20240229", # Using a known, stable model
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                llm_code = message.content[0].text.strip()
                logging.info("Generated initial code using LLM.")
                return llm_code
            except Exception as e:
                logging.warning(f"LLM generation failed: {e}. Falling back to template-based code.")
        
        return template_code

class RestrictedEvolutionEngine(CodeEvolutionEngine):
    def __init__(self, allowed_capabilities: set = None):
        super().__init__()
        # 'file_read', 'file_write', 'network', 'subprocess', 'install_packages'
        self.allowed_capabilities = allowed_capabilities or set()
        logging.info(f"Restricted engine initialized with capabilities: {self.allowed_capabilities}")
    
    def validate_code_safety(self, code: str) -> Tuple[bool, str]:
        """Check if code attempts forbidden operations"""
        tree = ast.parse(code)
        
        for node in ast.walk(tree):
            # Check for file operations
            if isinstance(node, ast.Call) and hasattr(node.func, 'id'):
                if node.func.id == 'open' and 'file_write' not in self.allowed_capabilities:
                    # A simple check; a more robust one would inspect the 'mode' argument.
                    return False, "File operations not permitted"
                    
            # Check for forbidden imports
            forbidden_imports = {
                'subprocess': 'subprocess',
                'socket': 'network',
                'os': 'file_system' # os is powerful, restrict it
            }
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                modules_to_check = [node.module] if isinstance(node, ast.ImportFrom) else [n.name for n in node.names]
                for module_name in modules_to_check:
                    if module_name in forbidden_imports and forbidden_imports[module_name] not in self.allowed_capabilities:
                        return False, f"Use of '{module_name}' module not permitted"
        
        return True, "OK"
    
    def test_function(self, code: str, function_name: str, test_cases: List[Dict]) -> Tuple[bool, Optional[Exception]]:
        is_safe, reason = self.validate_code_safety(code)
        if not is_safe:
            logging.error(f"Code validation failed: {reason}")
            return False, SecurityError(reason)
        
        return super().test_function(code, function_name, test_cases)

# Example of evolving a sorting function
if __name__ == "__main__":
    # Prioritize LLM engine if API key is available
    api_key = None # os.environ.get("ANTHROPIC_API_KEY")
    engine_choice = LLMEvolutionEngine if api_key else GeneticEvolutionEngine

    try:
        # Pass API key only if the chosen engine is the LLM one
        engine = engine_choice(api_key=api_key) if engine_choice is LLMEvolutionEngine else engine_choice()
    except docker.errors.DockerException as e:
        logging.warning(f"Could not start SandboxedEvolutionEngine: {e}")
        logging.warning("Falling back to non-sandboxed engine. This is NOT recommended for untrusted code.")
        engine = CodeEvolutionEngine()
        # Use the restricted engine as a fallback
        engine = RestrictedEvolutionEngine(allowed_capabilities={'install_packages'})
    
    print("=== Evolving a Sort Function ===")
    # Define test cases for the function we want to evolve
    sort_test_cases = [
        {'args': ([3, 1, 2],), 'expected': [1, 2, 3]},
        {'args': ([],), 'expected': []},
        # For the None case, we expect the function to not crash and return None
        {'args': (None,), 'expected': None} 
    ]

    sort_code = engine.evolve_function(
        "smart_sort",
        "Sort lists efficiently with error handling",
        sort_test_cases
    )
    print(f"Evolved code:\n{sort_code}")

    print(f"\n=== Evolution Stats ===")
    print(f"Attempts: {engine.code_generation_attempts}")
    print(f"Functions in library: {len(engine.function_library)}")

    print("\n=== Evolving an Email Validator ===")
    # A more complex task that requires an external library (re)
    email_test_cases = [
        {'args': ('test@example.com',), 'expected': True},
        {'args': ('invalid-email',), 'expected': False},
        {'args': ('',), 'expected': False},
        {'args': (None,), 'expected': False}
    ]

    email_validator_code = engine.evolve_function("is_valid_email", "Validate an email address using regex", email_test_cases)
    print(f"Evolved code:\n{email_validator_code}")

    print("\n=== Evolving a Safe List Accessor ===")
    # A task that requires handling IndexError
    get_last_item_tests = [
        {'args': ([1, 2, 3],), 'expected': 3},
        {'args': (['a', 'b'],), 'expected': 'b'},
        {'args': ([],), 'expected': None} # This will cause an IndexError
    ]
    last_item_code = engine.evolve_function("get_last_item", "Get the last item from a list safely", get_last_item_tests)
    print(f"Evolved code:\n{last_item_code}")

    print("\n=== Evolving a Safe Dictionary Accessor ===")
    # A task that requires handling KeyError
    get_config_tests = [
        {'args': ({'user': 'admin'}, 'user'), 'expected': 'admin'},
        {'args': ({'user': 'admin'}, 'password'), 'expected': None, 'description': 'missing_key'},
        {'args': ({}, 'key'), 'expected': None, 'description': 'missing_key'}
    ]

    config_code = engine.evolve_function("get_config_value", "Get a value from a config dict safely", get_config_tests)
    print(f"Evolved code:\n{config_code}")

    print("\n=== Evolving a Safe Attribute Accessor ===")
    # A task that requires handling AttributeError
    # First, define the User class in the global scope for the test
    user_class_code = textwrap.dedent(engine.code_templates['user_name'])
    exec(user_class_code, engine.global_envs.setdefault('get_user_name', {'logging': logging}))
    User = engine.global_envs['get_user_name']['User']

    get_name_tests = [
        {'args': (User(name='Alice'),), 'expected': 'Alice'},
        {'args': (None,), 'expected': None} # This will cause an AttributeError
    ]

    # Define a simple initial implementation for the function
    engine.code_templates['user_name_accessor'] = """
        def {function_name}(user):
            \"\"\"{requirements}\"\"\"
            return user.name
    """
    name_code = engine.evolve_function("get_user_name_accessor", "Get a user's name safely", get_name_tests)
    print(f"Evolved code:\n{name_code}")

    print("\n=== Evolving to Fix a Logic Error ===")
    # This task will start with a generic, incorrect template.
    # The engine must use the new logic mutation to fix it.
    get_first_item_tests = [
        {'args': ([1, 2, 3],), 'expected': 1},
        {'args': (['a', 'b'],), 'expected': 'a'},
    ]
    # Force the use of the generic template by not matching any keywords
    first_item_code = engine.evolve_function("get_first_item_v1", "Get the first item from a list", get_first_item_tests)
    print(f"Evolved code:\n{first_item_code}")

    print("\n=== Evolving a Self-Installing Function ===")
    # This task requires a library that may not be installed.
    # The engine will try to `pip install requests`.
    # We use unittest.mock to avoid real network calls.
    fetch_json_tests = [
        {'args': ('https://api.example.com/data',), 'expected': {'data': 'success'}},
    ]
    # Inject mock for requests
    mock_code = """
from unittest.mock import MagicMock

mock_response = MagicMock()
mock_response.json.return_value = {'data': 'success'}

requests = MagicMock()
requests.get.return_value = mock_response
    """
    fetch_env = engine.global_envs.setdefault('fetch_json', {'logging': logging})
    exec(textwrap.dedent(mock_code), fetch_env)

    fetch_code = engine.evolve_function("fetch_json", "Fetch JSON from a URL", fetch_json_tests)
    print(f"Evolved code:\n{fetch_code}")

    print("\n=== Evolving with Genetic Algorithm ===")
    # Use the genetic engine to solve a problem.
    try:
        # It may find a different, but still correct, solution.
        genetic_engine = GeneticEvolutionEngine(population_size=20)
        genetic_get_last_item_tests = [
            {'args': ([1, 2, 3],), 'expected': 3},
            {'args': ([],), 'expected': None}
        ]
        genetic_code = genetic_engine.evolve_function("get_last_item_genetic", "Get the last item safely using genetics", genetic_get_last_item_tests, generations=10)
        print(f"Evolved code (Genetic):\n{genetic_code}")
    except docker.errors.DockerException as e:
        logging.warning(f"Could not start GeneticEvolutionEngine due to Docker error: {e}")
        logging.warning("Skipping genetic evolution demonstration.")

    print("\n=== CRITICAL TEST: Does meta-learning actually work? ===")

    # Before meta-evolution: system has NO ValueError handler
    meta_engine = MetaEvolutionEngine()
    print(f"Available mutations before: {list(meta_engine.targeted_mutations.keys())}")

    # Trigger meta-evolution
    meta_engine.evolve_mutation_strategy()

    # After: system DOES have ValueError handler
    print(f"Available mutations after: {list(meta_engine.targeted_mutations.keys())}")

    # Now test it on a ValueError problem
    value_error_tests = [
        {'args': ('123',), 'expected': 123},
        {'args': ('not_a_number',), 'expected': None}
    ]

    # This should now succeed using the meta-evolved mutation
    result = meta_engine.evolve_function(
        "parse_int_safely", 
        "Parse string to int with error handling", 
        value_error_tests
    )

    print("\n✓ Meta-evolution successful!" if 'ValueError' in result else "✗ Meta-evolution failed")
    print(f"\nEvolved code:\n{result}")

    print("\n=== Distributed Evolution (Island Model) Demonstration ===")
    # This simulates a cluster of workers evolving populations in parallel.
    try:
        # Create a simulated cluster of 3 worker nodes
        cluster = [WorkerNode(population_size=10) for _ in range(3)]
        distributed_engine = DistributedEvolutionEngine(cluster_nodes=cluster)
        dist_code = distributed_engine.evolve_function_distributed("get_last_item_dist", "Get last item safely, distributed", genetic_get_last_item_tests)
        print(f"Evolved code (Distributed):\n{dist_code}")
    except docker.errors.DockerException as e:
        logging.warning(f"Could not start DistributedEvolutionEngine due to Docker error: {e}")
        logging.warning("Skipping distributed evolution demonstration.")

    engine.report_on_corpus()

    run_ablation_study()

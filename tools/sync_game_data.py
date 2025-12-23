#!/usr/bin/env python3
"""
Jump Space Game Data Sync Tool

Extracts component, reactor, and aux generator data from Jump Space game files
and generates JSON files in the format required by the power grid optimizer.

Usage:
    python sync_game_data.py                    # Extract and generate all files
    python sync_game_data.py --dry-run          # Show what would be generated without writing
    python sync_game_data.py --compare          # Compare with existing files
    python sync_game_data.py --game-path PATH   # Use custom game path

Output files:
    data/components.json      - All ship components with shapes
    data/reactors.json        - Reactor power grids (8x4)
    data/auxGenerators.json   - Aux generator power grids (8x2)
"""

import UnityPy
import UnityPy.config
import json
import os
import sys
import argparse
import warnings
from collections import defaultdict

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Suppress UnityPy warnings
warnings.filterwarnings('ignore')
UnityPy.config.FALLBACK_UNITY_VERSION = "2022.3.0f1"

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
DEFAULT_GAME_PATH = r"C:\Program Files (x86)\Steam\steamapps\common\JumpSpace"

# Category mappings for display
CATEGORY_MAP = {
    "engine": "ENGINES",
    "pilotcannon": "PILOT CANNONS",
    "multiturret": "MULTI-TURRET SYSTEMS",
    "reactor": "REACTORS",
    "sensor": "SENSORS",
    "shieldgenerator": "SHIELD GENERATORS",
    "specialweapon": "SPECIAL WEAPONS",
    "auxiliary": "AUX GENERATORS",
}


# =============================================================================
# Data Extraction Functions
# =============================================================================

def load_bundles(game_path):
    """Load required asset bundles."""
    base_path = os.path.join(game_path, r"Jump Space_Data\StreamingAssets\aa\StandaloneWindows64")
    
    main_bundle = os.path.join(base_path, "ag_managed_default_assets_all.bundle")
    loc_bundle = os.path.join(base_path, "localization-string-tables-english(en)_assets_all.bundle")
    
    if not os.path.exists(main_bundle):
        raise FileNotFoundError(f"Main bundle not found: {main_bundle}")
    
    print(f"Loading main bundle...")
    main_env = UnityPy.load(main_bundle)
    
    loc_env = None
    if os.path.exists(loc_bundle):
        print(f"Loading localization bundle...")
        loc_env = UnityPy.load(loc_bundle)
    else:
        print(f"Warning: Localization bundle not found, using fallback names")
    
    return main_env, loc_env


def extract_localization(loc_env):
    """Extract localization strings from the English string table."""
    loc_strings = {}
    
    if loc_env is None:
        return loc_strings
    
    for path, obj in loc_env.container.items():
        if 'STC_Main' in path:
            try:
                data = obj.read()
                for entry in data.m_TableData:
                    loc_strings[entry.m_Id] = entry.m_Localized
            except:
                pass
    
    print(f"  Loaded {len(loc_strings)} localization strings")
    return loc_strings


def extract_plug_shapes(env):
    """Extract all EngineerPlug shapes from the bundle."""
    plug_shapes = {}
    
    print("Extracting plug shapes...")
    for path, obj in env.container.items():
        if 'EngineerPlug_' not in path or not path.endswith('.asset'):
            continue
        
        try:
            obj_type = obj.type.name
        except (ValueError, AttributeError):
            continue
        
        if obj_type != 'MonoBehaviour':
            continue
        
        try:
            data = obj.read()
            name = data.m_Name
            plug_array = data.m_PowerPlugArray
            
            h = plug_array.m_GridSizeHorizontal
            v = plug_array.m_GridSizeVertical
            rows_obj = plug_array.m_Rows
            
            grid = []
            for row_obj in rows_obj:
                row_data = list(row_obj.m_Row)
                grid.append(row_data)
            
            plug_shapes[name] = {
                "width": h,
                "height": v,
                "grid": grid
            }
            
        except Exception as e:
            pass
    
    print(f"  Extracted {len(plug_shapes)} plug shapes")
    return plug_shapes


def extract_components(env, loc_strings):
    """Extract all component data from the bundle."""
    components = []
    
    print("Extracting components...")
    for path, obj in env.container.items():
        if 'Prefabs/Components/' not in path:
            continue
        if not path.endswith('.asset'):
            continue
        if 'Projectile_' in path or 'MissileData_' in path:
            continue
        if 'Settings' in path or 'Curve' in path or 'Category' in path:
            continue
        
        try:
            obj_type = obj.type.name
        except (ValueError, AttributeError):
            continue
        
        if obj_type != 'MonoBehaviour':
            continue
        
        try:
            data = obj.read()
            game_name = data.m_Name
            
            if not game_name.startswith('Component_'):
                continue
            
            # Get display name from localization
            display_name = None
            try:
                loc_ref = data.m_ItemNameLoc
                key_id = loc_ref.m_TableEntryReference.m_KeyId
                display_name = loc_strings.get(key_id)
            except:
                pass
            
            # Get plug reference
            plug_ref = None
            if hasattr(data, 'm_PlugData'):
                try:
                    plug_data = data.m_PlugData.read()
                    plug_ref = plug_data.m_Name
                except:
                    pass
            
            # Get power source array if present (for reactors/aux)
            power_grid = None
            if hasattr(data, 'm_PowerSourceArray'):
                try:
                    psa = data.m_PowerSourceArray
                    rows = []
                    for row_obj in psa.m_Rows:
                        rows.append(list(row_obj.m_Row))
                    power_grid = rows
                except:
                    pass
            
            # Determine category from path
            category = "other"
            path_lower = path.lower()
            if "/auxiliary/" in path_lower:
                category = "auxiliary"
            elif "/engine/" in path_lower:
                category = "engine"
            elif "/multiturret/" in path_lower:
                category = "multiturret"
            elif "/pilotcannon/" in path_lower:
                category = "pilotcannon"
            elif "/reactor/" in path_lower:
                category = "reactor"
            elif "/sensor/" in path_lower:
                category = "sensor"
            elif "/shieldgenerator/" in path_lower:
                category = "shieldgenerator"
            elif "/specialweapon" in path_lower:
                category = "specialweapon"
            
            components.append({
                "gameName": game_name,
                "displayName": display_name,
                "tier": getattr(data, 'm_Tier', 1),
                "plugName": plug_ref,
                "category": category,
                "powerLevel": getattr(data, 'm_PowerLevel', 1.0),
                "powerGrid": power_grid,
            })
            
        except Exception as e:
            pass
    
    print(f"  Extracted {len(components)} components")
    return components


def get_component_id(game_name):
    """Convert game name to a simple camelCase ID based on display name pattern.
    
    Uses the first tier's display name to create the ID.
    """
    # Remove 'Component_' prefix and tier suffix
    name = game_name.replace('Component_', '')
    parts = name.split('_')
    
    # Remove tier suffix if present
    if len(parts) >= 2 and parts[-1].isdigit():
        parts = parts[:-1]
    
    return '_'.join(parts).lower()


def make_camel_case_id(display_name):
    """Convert display name to camelCase ID."""
    if not display_name:
        return None
    
    # Split into words
    words = display_name.replace('-', ' ').split()
    
    # Convert to camelCase
    if not words:
        return None
    
    result = words[0].lower()
    for word in words[1:]:
        result += word.capitalize()
    
    # Remove special characters
    result = ''.join(c for c in result if c.isalnum())
    
    return result


def calculate_power_stats(grid):
    """Calculate power statistics from a grid.
    
    Game/App encoding:
        0 = unprotected power (can place)
        1 = protected power
        4 = blocked (no power)
    """
    total = 0
    protected = 0
    unprotected = 0
    
    for row in grid:
        for cell in row:
            if cell == 0:
                unprotected += 1
                total += 1
            elif cell == 1:
                protected += 1
                total += 1
            # cell == 4 is blocked, doesn't count
    
    return {
        "powerGeneration": total,
        "protectedPower": protected,
        "unprotectedPower": unprotected
    }


# =============================================================================
# JSON Generation Functions
# =============================================================================

def generate_components_json(components, plug_shapes):
    """Generate components.json in the required format."""
    result = {}
    
    # Group by base type (using first tier to get display name)
    by_type = defaultdict(list)
    for comp in components:
        if comp['category'] in ['reactor', 'auxiliary']:
            continue
        
        base_id = get_component_id(comp['gameName'])
        by_type[base_id].append(comp)
    
    # Build output
    for base_id, tier_comps in sorted(by_type.items()):
        # Get display name from first tier
        first_tier = min(tier_comps, key=lambda x: x['tier'])
        display_name = first_tier.get('displayName') or base_id.replace('_', ' ').title()
        
        # Create camelCase ID from display name
        friendly_id = make_camel_case_id(display_name) or base_id
        
        category = tier_comps[0]['category']
        display_category = CATEGORY_MAP.get(category, category.upper())
        
        tiers = {}
        for comp in sorted(tier_comps, key=lambda x: x['tier']):
            tier_num = comp['tier']
            plug_name = comp['plugName']
            
            # Get the actual shape grid
            shape = [[1]]
            if plug_name and plug_name in plug_shapes:
                shape = plug_shapes[plug_name]['grid']
            
            tiers[str(tier_num)] = {
                "shape": shape
            }
        
        result[friendly_id] = {
            "id": friendly_id,
            "name": display_name,
            "category": display_category,
            "tiers": tiers
        }
    
    return result


def generate_reactors_json(components):
    """Generate reactors.json with power grids from game data."""
    result = {}
    
    # Group reactor components
    by_type = defaultdict(list)
    for comp in components:
        if comp['category'] != 'reactor':
            continue
        
        base_id = get_component_id(comp['gameName'])
        by_type[base_id].append(comp)
    
    for base_id, tier_comps in sorted(by_type.items()):
        first_tier = min(tier_comps, key=lambda x: x['tier'])
        display_name = first_tier.get('displayName') or base_id.replace('_', ' ').title()
        friendly_id = make_camel_case_id(display_name) or base_id
        
        tiers = {}
        for comp in sorted(tier_comps, key=lambda x: x['tier']):
            tier_num = str(comp['tier'])
            grid = comp.get('powerGrid', [[4]*8]*4)  # Default to blocked
            
            stats = calculate_power_stats(grid)
            
            tiers[tier_num] = {
                "powerGeneration": stats["powerGeneration"],
                "protectedPower": stats["protectedPower"],
                "unprotectedPower": stats["unprotectedPower"],
                "grid": grid
            }
        
        result[friendly_id] = {
            "id": friendly_id,
            "name": display_name,
            "category": "REACTORS",
            "tiers": tiers
        }
    
    return result


def generate_aux_generators_json(components):
    """Generate auxGenerators.json with power grids from game data."""
    # Start with "none" entry
    result = {
        "none": {
            "id": "none",
            "name": "None",
            "category": "AUX GENERATORS",
            "tiers": {
                "1": {
                    "powerGeneration": 0,
                    "protectedPower": 0,
                    "unprotectedPower": 0,
                    "grid": [[4]*8, [4]*8]  # All blocked (no power)
                }
            }
        }
    }
    
    # Group aux components
    by_type = defaultdict(list)
    for comp in components:
        if comp['category'] != 'auxiliary':
            continue
        
        base_id = get_component_id(comp['gameName'])
        by_type[base_id].append(comp)
    
    for base_id, tier_comps in sorted(by_type.items()):
        first_tier = min(tier_comps, key=lambda x: x['tier'])
        display_name = first_tier.get('displayName') or base_id.replace('_', ' ').title()
        friendly_id = make_camel_case_id(display_name) or base_id
        
        tiers = {}
        for comp in sorted(tier_comps, key=lambda x: x['tier']):
            tier_num = str(comp['tier'])
            grid = comp.get('powerGrid', [[0]*8, [0]*8])
            
            stats = calculate_power_stats(grid)
            
            tiers[tier_num] = {
                "powerGeneration": stats["powerGeneration"],
                "protectedPower": stats["protectedPower"],
                "unprotectedPower": stats["unprotectedPower"],
                "grid": grid
            }
        
        result[friendly_id] = {
            "id": friendly_id,
            "name": display_name,
            "category": "AUX GENERATORS",
            "tiers": tiers
        }
    
    return result


# =============================================================================
# Comparison Functions
# =============================================================================

def compare_json(generated, existing_file, name):
    """Compare generated data with existing file and report differences."""
    if not os.path.exists(existing_file):
        print(f"\n[{name}] No existing file at {existing_file}")
        return
    
    with open(existing_file, 'r') as f:
        existing = json.load(f)
    
    print(f"\n{'='*60}")
    print(f"COMPARISON: {name}")
    print(f"{'='*60}")
    
    existing_keys = set(existing.keys())
    generated_keys = set(generated.keys())
    
    new_keys = generated_keys - existing_keys
    if new_keys:
        print(f"\n[+] NEW in game ({len(new_keys)}):")
        for key in sorted(new_keys):
            gen = generated[key]
            tier_list = list(gen.get('tiers', {}).keys())
            print(f"    + {key}: {gen.get('name', '?')} (tiers {tier_list})")
    
    missing_keys = existing_keys - generated_keys
    if missing_keys:
        print(f"\n[-] In file but NOT in game ({len(missing_keys)}):")
        for key in sorted(missing_keys):
            print(f"    - {key}")
    
    diff_count = 0
    for key in existing_keys & generated_keys:
        ex = existing[key]
        gen = generated[key]
        
        ex_tiers = ex.get('tiers', {})
        gen_tiers = gen.get('tiers', {})
        
        for tier in set(gen_tiers.keys()) - set(ex_tiers.keys()):
            if diff_count == 0:
                print(f"\n[~] Differences:")
            print(f"    + {key} tier {tier}: NEW")
            diff_count += 1
        
        for tier in set(ex_tiers.keys()) & set(gen_tiers.keys()):
            ex_grid = ex_tiers[tier].get('grid') or ex_tiers[tier].get('shape')
            gen_grid = gen_tiers[tier].get('grid') or gen_tiers[tier].get('shape')
            
            if ex_grid != gen_grid:
                if diff_count == 0:
                    print(f"\n[~] Differences:")
                print(f"    ~ {key} tier {tier}: grid/shape differs")
                diff_count += 1
                if diff_count <= 3:
                    print(f"        Existing: {ex_grid}")
                    print(f"        Game:     {gen_grid}")
    
    if not any([new_keys, missing_keys, diff_count]):
        print("\n[OK] All data matches!")


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Sync game data to JSON files")
    parser.add_argument("--game-path", "-g", default=DEFAULT_GAME_PATH,
                       help="Path to Jump Space installation")
    parser.add_argument("--dry-run", "-n", action="store_true",
                       help="Show what would be generated without writing files")
    parser.add_argument("--compare", "-c", action="store_true",
                       help="Compare with existing files and show differences")
    parser.add_argument("--output-dir", "-o", default=DATA_DIR,
                       help="Output directory for generated files")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Jump Space Game Data Sync")
    print("=" * 60)
    print(f"Game path: {args.game_path}")
    print(f"Output dir: {os.path.abspath(args.output_dir)}")
    print()
    
    # Load bundles
    try:
        main_env, loc_env = load_bundles(args.game_path)
    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        return 1
    
    # Extract data
    loc_strings = extract_localization(loc_env)
    plug_shapes = extract_plug_shapes(main_env)
    components = extract_components(main_env, loc_strings)
    
    # Generate JSON structures
    print("\nGenerating JSON files...")
    components_json = generate_components_json(components, plug_shapes)
    reactors_json = generate_reactors_json(components)
    aux_json = generate_aux_generators_json(components)
    
    print(f"  components.json: {len(components_json)} component types")
    print(f"  reactors.json: {len(reactors_json)} reactor types")
    print(f"  auxGenerators.json: {len(aux_json)} generator types")
    
    # Compare or save
    if args.compare:
        compare_json(components_json, os.path.join(args.output_dir, "components.json"), "components.json")
        compare_json(reactors_json, os.path.join(args.output_dir, "reactors.json"), "reactors.json")
        compare_json(aux_json, os.path.join(args.output_dir, "auxGenerators.json"), "auxGenerators.json")
    elif args.dry_run:
        print("\n[DRY RUN] Would generate:")
        print(f"  - components.json ({len(components_json)} items)")
        print(f"  - reactors.json ({len(reactors_json)} items)")
        print(f"  - auxGenerators.json ({len(aux_json)} items)")
        
        print("\nSample components:")
        for i, (key, value) in enumerate(components_json.items()):
            if i >= 2:
                break
            print(json.dumps({key: value}, indent=2))
        
        print("\nSample reactor:")
        for key, value in list(reactors_json.items())[:1]:
            print(json.dumps({key: value}, indent=2))
    else:
        os.makedirs(args.output_dir, exist_ok=True)
        
        comp_file = os.path.join(args.output_dir, "components.json")
        with open(comp_file, 'w') as f:
            json.dump(components_json, f, indent=2)
        print(f"\nSaved: {comp_file}")
        
        reactor_file = os.path.join(args.output_dir, "reactors.json")
        with open(reactor_file, 'w') as f:
            json.dump(reactors_json, f, indent=2)
        print(f"Saved: {reactor_file}")
        
        aux_file = os.path.join(args.output_dir, "auxGenerators.json")
        with open(aux_file, 'w') as f:
            json.dump(aux_json, f, indent=2)
        print(f"Saved: {aux_file}")
        
        print("\n" + "=" * 60)
        print("Sync complete!")
        print("=" * 60)
        print(f"\nGrid values (game encoding): 0=powered, 1=protected, 4=blocked")
    
    return 0


if __name__ == "__main__":
    exit(main())

### Example 1: Define a Function That Takes an Argument

# Define a function named greet that takes one parameter
def greet(name):
    print(f"Hello, {name}!")

# Call the function with an argument
# greet("Alfonso")

# Explanation:
# In the function definition, 'name' is the parameter.
# When we call the function with "Alice", "Alice" is the argument.

### Example 2: Call Your Function with Different Kinds of Arguments

# # Calling the function with a value
# greet("Samantha")  # Argument: value "Samantha"

# # Calling the function with a variable
# friend_name = "Derek"
# greet(friend_name)  # Argument: variable friend_name

# # Calling the function with an expression
# greet("Bru" + "no")  # Argument: expression "Bru" + "no"

# # Explanation:
# # "Samantha" is a direct value.
# # 'friend_name' is a variable.
# # "Bru" + "no" is an expression that evaluates to "Bruno".

### Example 3: Function with a Local Variable

# def multiply_by_two(number):
#     result = number * 2  # 'result' is a local variable
#     return result

# print(multiply_by_two(5))
# # print(result)  # This would cause an error because 'result' is not defined outside the function.

# Explanation:
# 'result' is a local variable within the multiply_by_two function.
# Trying to access 'result' outside the function results in a NameError.

### Example 4: Unique Parameter Name

# def display_message(custom_parameter):
#     print(f"The message is: {custom_parameter}")

# display_message("This is a unique parameter")

# Explanation:
# 'custom_parameter' is a unique name within the display_message function.
# Trying to use 'custom_parameter' outside this function will result in a NameError.
# print(custom_parameter)  # Uncommenting this line would cause a NameError.

### Example 5: Variable Scope

name = "Alfonso"  # Global variable

def introduce():
    name = "Smantha"  # Local variable with the same name
    print(f"Inside function: My name is {name}")

introduce()
print(f"Outside function: My name is {name}")

# Explanation:
# There are two variables named 'name'. One is a global variable, and the other is a local variable within the function.
# The value of the local 'name' variable only affects the function scope, while the global 'name' variable remains unchanged outside the function.

### Discussion Question

# What are the potential pitfalls of using global variables in large-scale software projects, and how can you mitigate these issues using better programming practices?

# Looking forward to your creative responses! 😊
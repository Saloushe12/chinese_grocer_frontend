import apiClient from '@/api/client'

export class ApiTester {
  static async testConnection(): Promise<boolean> {
    try {
      // Try to create a test store to verify connection
      const testStore = {
        name: 'Test Store',
        address: 'Test Address'
      }
      
      const response = await apiClient.createStore(testStore)
      console.log('✅ API Connection successful! Created store:', response)
      
      // Clean up - delete the test store
      if (response.storeId) {
        await apiClient.deleteStore(response.storeId)
        console.log('✅ Test store cleaned up')
      }
      
      return true
    } catch (error: any) {
      console.error('❌ API Connection failed:', error.message)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
      }
      return false
    }
  }

  static async testAllEndpoints(): Promise<void> {
    console.log('🧪 Testing all API endpoints...')
    
    try {
      // Test Store endpoints
      console.log('Testing Store endpoints...')
      const storeResponse = await apiClient.createStore({
        name: 'API Test Store',
        address: '123 Test Street'
      })
      console.log('✅ Store created:', storeResponse.storeId)
      
      const storeData = await apiClient.getStore(storeResponse.storeId)
      console.log('✅ Store retrieved:', storeData)
      
      // Test User endpoints
      console.log('Testing User endpoints...')
      const userResponse = await apiClient.registerUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123'
      })
      console.log('✅ User registered:', userResponse.userId)
      
      const authResponse = await apiClient.authenticateUser({
        usernameOrEmail: 'testuser',
        password: 'testpassword123'
      })
      console.log('✅ User authenticated:', authResponse.userId)
      
      // Test Review endpoints
      console.log('Testing Review endpoints...')
      const reviewResponse = await apiClient.createReview({
        userId: authResponse.userId,
        storeId: storeResponse.storeId,
        text: 'Great test store!',
        rating: 5
      })
      console.log('✅ Review created:', reviewResponse.reviewId)
      
      // Test Tagging endpoints
      console.log('Testing Tagging endpoints...')
      await apiClient.addTag({
        storeId: storeResponse.storeId,
        tag: 'test-tag'
      })
      console.log('✅ Tag added')
      
      const storesByTag = await apiClient.getStoresByTag({ tag: 'test-tag' })
      console.log('✅ Stores by tag:', storesByTag)
      
      // Test Rating endpoints
      console.log('Testing Rating endpoints...')
      await apiClient.updateRating({
        storeId: storeResponse.storeId,
        contribution: { rating: 5, weight: 1 }
      })
      console.log('✅ Rating updated')
      
      const rating = await apiClient.getRating({ storeId: storeResponse.storeId })
      console.log('✅ Rating retrieved:', rating)
      
      // Cleanup
      console.log('Cleaning up test data...')
      await apiClient.deleteReview(reviewResponse.reviewId)
      await apiClient.removeTag({ storeId: storeResponse.storeId, tag: 'test-tag' })
      await apiClient.deleteUser(authResponse.userId)
      await apiClient.deleteStore(storeResponse.storeId)
      console.log('✅ All test data cleaned up')
      
      console.log('🎉 All API endpoints working correctly!')
      
    } catch (error: any) {
      console.error('❌ API test failed:', error.message)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
      }
    }
  }
}

// Export for use in components
export default ApiTester
